import { google } from 'googleapis';
import { Credentials, OAuth2Client } from 'google-auth-library';
import { KNowledge } from '../models/knowledge';
import { vectorizeAndStore } from './vectorize.service';
import { User } from '../models/users';
import { chunker } from './chunker';
import { MAX_FETCH_DAYS, MAX_FETCH_RECORDS, ONE_DAY_MS } from '@financial-ai/types';


const decodeBase64Url = (data: string): string => {
    // Gmail uses '-' instead of '+' and '_' instead of '/'
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
};

const getPlainText = (payload: any): string => {
    if (payload.body?.data) {
        return decodeBase64Url(payload.body.data);
    }
    if (payload.parts) {
        for (const part of payload.parts) {
            const result = getPlainText(part);
            if (result) return result;
        }
    }
    return '';
};

export async function syncUserGmail(userId: string) {
    const user = await User.findById(userId)
    if (!user) return
    if (user.gmailSyncing) return

    const tokens: Credentials = {
        refresh_token: user.refreshToken,
        access_token: user.accessToken
    }
    
    try {
        user.gmailSyncing = true
        await user.save()

        const lastRec = await KNowledge.aggregate([
            { $match: { userId, 'metadata.source': 'gmail' } },
            { $group: { _id: null, last: { $max: '$timestamp' } } }
        ])

        const lastSyncedAt: number = lastRec.length ? lastRec[0].last : (Date.now() - (ONE_DAY_MS * MAX_FETCH_DAYS))

        const auth = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );

        auth.setCredentials(tokens);

        const gmail = google.gmail({ version: 'v1', auth });

        const lastSync = Math.floor(lastSyncedAt / 1000)

        const listResponse = await gmail.users.messages.list({
            userId: 'me',
            maxResults: MAX_FETCH_RECORDS,
            q: `after:${lastSync}`
        });

        const messages = listResponse.data.messages || [];

        for (const msg of messages) {
            const existing = await KNowledge.findOne({ "metadata.externalId": msg.id, userId });
            if (existing) continue;

            const details = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id,
                format: 'full'
            });

            const headers = details.data.payload?.headers || [];
            const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
            const from = headers.find(h => h.name === 'From')?.value || 'Unknown';

            // Use the recursive helper to find and decode the body
            const rawBody = getPlainText(details.data.payload);

            if (!rawBody) continue;

            const internalDateMs = parseInt(details.data.internalDate);

            const chunks = await chunker(rawBody)
            await vectorizeAndStore(userId, { id: msg.id, subject, from, type: 'email_chunk' }, chunks, 'gmail', internalDateMs, msg.id);
        }
    } catch (e) {
        console.log(">>>Error when syncing google", e)
    } finally {
        user.gmailSyncing = false
        await user.save()
    }
}