import { google } from 'googleapis';
import { User } from '../models/users';

export async function setCalendarEvent(
    userId: string, 
    title: string, 
    start_datetime: string, 
    duration: string = '30', // Duration in minutes as a string
    description?: string
) {
    console.log("--->event:",title,start_datetime)
    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            'postmessage'
        );

        const user = await User.findById(userId);
        if (!user) return "User not found";

        // Set credentials using stored tokens
        oauth2Client.setCredentials({
            access_token: user.accessToken,
            refresh_token: user.refreshToken
        });

        // Initialize Calendar API
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // Calculate End Time
        const startTime = new Date(start_datetime);
        const endTime = new Date(startTime.getTime() + parseInt(duration) * 60000);

        console.log(">>>",startTime,endTime)
        const event = {
            summary: title,
            description: description || '',
            start: {
                dateTime: startTime.toISOString(),
                timeZone: 'UTC', // Ideally, store and use user.timezone
            },
            end: {
                dateTime: endTime.toISOString(),
                timeZone: 'UTC',
            },
            reminders: {
                useDefault: true,
            },
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
        });

        return `Calendar Event created: ${response.data.htmlLink}`;
    } catch (e: any) {
        console.error("--> Calendar Error:", e);
        // Specifically check for scope errors
        if (e.message?.includes('insufficient authentication scopes')) {
            return "Error: App needs Calendar Write permissions. Please re-login.";
        }
        return 'Error in creating calendar event: ' + e.message;
    }
}