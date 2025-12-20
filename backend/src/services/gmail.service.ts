import { google } from 'googleapis';
import { Credentials, OAuth2Client } from 'google-auth-library';
import { KNowledge } from '../models/knowledge';
import { vectorizeAndStore } from './vectorize.service';
import { User } from '../models/users';
import { chunker } from './chunker';

const INITIAL_EMAIL_DAYS = 5
const ONE_DAY_MS = 86400000

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

export async function syncUserGmail(userId: string, tokens: Credentials) {
    const user = await User.findById(userId);
    if (!user) return
    const lastSyncedAt = user.lastSyncedAt
    const auth = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials(tokens);

    const gmail = google.gmail({ version: 'v1', auth });

    const lastSync = lastSyncedAt
        ? Math.floor(lastSyncedAt / 1000)
        : Math.floor((Date.now() - (ONE_DAY_MS * INITIAL_EMAIL_DAYS)) / 1000);

    const listResponse = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 50,
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


        const chunks = await chunker(rawBody)
        await vectorizeAndStore(userId, { id: msg.id, subject, from, type: 'email_chunk' }, chunks, 'gmail');
    }

    user.lastSyncedAt = Date.now()
    await user.save();
}