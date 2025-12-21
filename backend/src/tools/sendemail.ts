import { google } from 'googleapis';
import { User } from '../models/users';

export async function sendEmail(userId: string, to: string, subject: string, body: string) {
    try {
        console.log(">>>", userId, to, body, subject)
        const oauth2Client = new google.auth.OAuth2(
            process.env.CLIENT_ID,
            process.env.CLIENT_SECRET,
            'postmessage'
        );

        const user = await User.findById(userId)
        console.log("--->1")
        // Set the user's tokens (Access + Refresh)
        oauth2Client.setCredentials({
            access_token: user.accessToken,
            refresh_token: user.refreshToken
        });

        console.log("--->2")
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Gmail API requires the email to be base64url encoded
        const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
        const messageParts = [
            `From: <me>`,
            `To: ${to}`,
            'Content-Type: text/html; charset=utf-8',
            'MIME-Version: 1.0',
            `Subject: ${utf8Subject}`,
            '',
            body,
        ];
        const message = messageParts.join('\n');
        console.log("--->3")
        // Encode the message to base64url
        const encodedMessage = Buffer.from(message)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        console.log("--->4")
        const res = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage,
            },
        });

        console.log("--->5")
        return `Email Sent to ${to} with subject ${subject}`;
    } catch {
        console.log("-->Error")
        return 'Error in sending email to ' + to
    }
}