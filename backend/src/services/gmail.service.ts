import { google } from 'googleapis';
import { Credentials, OAuth2Client } from 'google-auth-library';
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { KNowledge } from '../models/knowledge';
import { vectorizeAndStore } from './vectorize.service';
import { User } from '../models/users';


/**
 * Cleans raw email body by removing HTML tags and excessive whitespace.
 */
const cleanEmailBody = (text: string): string => {
    return text
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ')    // Normalize whitespace
        .trim();
};

/**
 * Main sync function to fetch, process, and store Gmail messages for RAG.
 */
export async function syncUserGmail(lastSyncedAt: number, userId: string, tokens: Credentials) {
    const user = await User.findById(userId);
    const auth = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials(tokens);

    const gmail = google.gmail({ version: 'v1', auth });

    const lastSync = lastSyncedAt
        ? Math.floor(lastSyncedAt / 1000)
        : Math.floor(Date.now() / 1000) - 86400 * 30;

    const listResponse = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 50,
        q: `after:${lastSync}`
    });

    const messages = listResponse.data.messages || [];

    // Initialize the splitter for RAG chunks
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });

    for (const msg of messages) {
        if (!msg.id) continue;

        // Check if we already processed this email to avoid duplicates
        const existing = await KNowledge.findOne({ "metadata.externalId": msg.id, userId });
        if (existing) continue;

        // 2. Fetch full message details
        const details = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'full'
        });

        // Extract metadata
        const headers = details.data.payload?.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown';

        // Extract and decode body (handles single part or multipart)
        let bodyEncoded = '';
        const payload = details.data.payload;
        if (payload?.parts) {
            // Prefer plain text part
            const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
            bodyEncoded = textPart?.body?.data || payload.parts[0]?.body?.data || '';
        } else {
            bodyEncoded = payload?.body?.data || '';
        }

        const bodyDecoded = Buffer.from(bodyEncoded, 'base64').toString('utf-8');
        const cleanedText = cleanEmailBody(bodyDecoded);

        // 3. Chunk the text
        const chunks = await splitter.splitText(cleanedText);

        // 4. Vectorize and Store each chunk
        await vectorizeAndStore(userId, { id: msg.id, subject, from }, chunks)
        console.log(`Successfully indexed message: ${subject}`);
    }
    user.lastSyncedAt = Date.now()
    await user.save()
}