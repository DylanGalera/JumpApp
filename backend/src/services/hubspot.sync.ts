import { Client } from '@hubspot/api-client';
import { User } from '../models/users';
import { chunker } from './chunker';
import { vectorizeAndStore } from './vectorize.service';
import { FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/objects/notes';
const ONE_DAY_MS = 86400000
const hubspotClient = new Client();

async function getValidClient(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const { refresh_token, expiresAt } = user.hubspotTokens;

    if (new Date() >= new Date(expiresAt)) {
        const result = await hubspotClient.oauth.tokensApi.create(
            'refresh_token',
            undefined,
            undefined,
            process.env.HUBSPOT_CLIENT_ID,
            process.env.HUBSPOT_CLIENT_SECRET,
            refresh_token
        );

        user.hubspotTokens.access_token = result.accessToken;
        user.hubspotTokens.expiresAt = Date.now() + result.expiresIn * 1000;
        await user.save();
    }

    hubspotClient.setAccessToken(user.hubspotTokens.access_token);
    return hubspotClient;
}

export async function syncHubspotData(userId: string) {
    const user = await User.findById(userId);
    if (!user) return;
    if (!user.hubspotTokens) return

    const client = await getValidClient(userId);

    const lastTime = user.hubspotLastSyncedAt || (Date.now() - ONE_DAY_MS * 10)

    let newestTimestamp = user.hubspotLastSyncedAt || 0;

    // --- SYNC NOTES ---
    const notesSearch = await client.crm.objects.notes.searchApi.doSearch({
        filterGroups: [{
            filters: [{ propertyName: 'hs_timestamp', operator: FilterOperatorEnum.Gte, value: lastTime.toString() }]
        }],
        sorts: ['-hs_timestamp'],
        properties: ['hs_note_body', 'hs_timestamp'],
        limit: 200
    });

    for (const note of notesSearch.results) {
        const text = note.properties.hs_note_body || "";
        const modDate = new Date(note.properties.hs_timestamp).getTime();
        if (modDate > newestTimestamp) newestTimestamp = modDate;

        //const associatedContactId = note.associations?.contacts?.results?.[0]?.id;

        const fullNote = await client.crm.objects.notes.basicApi.getById(
            note.id,
            ['hs_note_body'],
            undefined,
            ['contact'] // Explicitly request contact associations here
        );

        const associatedContactId = fullNote.associations?.contacts?.results?.[0]?.id;

        let contactEmail = 'Unknown';

        if (associatedContactId) {
            const contact = await client.crm.contacts.basicApi.getById(associatedContactId, ['email']);
            contactEmail = contact.properties.email || 'No Email';
        }

        const chunks = await chunker(text);
        if (!chunks.length) continue
        const subject = chunks[0].split('\n')[0].substring(0, 50) + "...";

        await vectorizeAndStore(userId, {
            id: note.id,
            from: contactEmail,
            subject,
            type: 'note_chunk'
        }, chunks, 'hubspot');
    }

    // --- SYNC CONTACTS ---
    const contactSearch = await client.crm.contacts.searchApi.doSearch({
        filterGroups: [{
            filters: [{ propertyName: 'lastmodifieddate', operator: FilterOperatorEnum.Gte, value: lastTime.toString() }]
        }],
        sorts: ['-lastmodifieddate'],
        properties: ['firstname', 'lastname', 'email', 'jobtitle', 'company', 'lifecyclestage', 'city', 'lastmodifieddate'],
        limit: 200
    });

    for (const contact of contactSearch.results) {
        const p = contact.properties;
        const modDate = new Date(p.lastmodifieddate).getTime();
        if (modDate > newestTimestamp) newestTimestamp = modDate;

        const contactInfo = `Contact: ${p.firstname} ${p.lastname} (${p.email}). ` +
            `Job Title: ${p.jobtitle || 'N/A'}. Company: ${p.company || 'N/A'}. ` +
            `Status: ${p.lifecyclestage}. Location: ${p.city || 'Unknown'}.`;

        await vectorizeAndStore(userId, {
            id: contact.id,
            from: p.email,
            subject: `${p.firstname} ${p.lastname}`,
            type: 'contact'
        }, [contactInfo], 'hubspot');
    }

    // 2. Update the user's sync timestamp to the latest date found
    user.hubspotLastSyncedAt = newestTimestamp + 1;
    await user.save();
}