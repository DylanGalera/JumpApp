import { google } from 'googleapis';
import { Credentials, OAuth2Client } from 'google-auth-library';
import { KNowledge } from '../models/knowledge';
import { vectorizeAndStore } from './vectorize.service';
import { User } from '../models/users';
import { MAX_FETCH_DAYS, ONE_DAY_MS } from '@financial-ai/types';


export async function syncUserCalendar(userId: string) {
    const user = await User.findById(userId)
    if (!user) return
    if (user.calendarSyncing) return

    const tokens: Credentials = {
        refresh_token: user.refreshToken,
        access_token: user.accessToken
    }

    try {
        user.calendarSyncing = true
        await user.save()

        const lastRec = await KNowledge.aggregate([
            { $match: { userId, 'metadata.source': 'calendar' } },
            { $group: { _id: null, last: { $max: '$timestamp' } } }
        ])

        const lastSyncedAt: number = lastRec.length ? lastRec[0].last : (Date.now() - (ONE_DAY_MS * MAX_FETCH_DAYS))

        const auth = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            'postmessage'
        );

        auth.setCredentials(tokens);

        const calendar = google.calendar({ version: 'v3', auth });

        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date(lastSyncedAt).toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = response.data.items;
        if (!events || events.length === 0) {
            return;
        }

        for (const event of events) {
            const existing = await KNowledge.findOne({ "metadata.externalId": event.id, userId });
            if (existing) continue;

            const title = event.summary || '(No Title)'
            const start = event.start?.dateTime || event.start?.date
            const end = event.end?.dateTime || event.end?.date
            const description = event.description || ''

            const startDate = new Date(start)
            const endDate = new Date(end)
            await vectorizeAndStore(userId, { id: event.id, subject: title, from: '', type: 'calendar_event' }, [`CALENDAR EVENT:\n[TITLE:${title}]\n[START:${startDate.toISOString()}]\n[END:${endDate.toISOString()}]\n[DESCRIPTION:${description}]`], 'calendar', Date.now(), event.id);
        }
    } catch (e) {
        console.log(">>>Error when syncing google", e)
    } finally {
        user.calendarSyncing = false
        await user.save()
    }
}