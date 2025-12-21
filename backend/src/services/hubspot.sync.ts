import { Client } from '@hubspot/api-client';
import { User } from '../models/users';
import { chunker } from './chunker';
import { vectorizeAndStore } from './vectorize.service';
import { FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/objects/notes';
import { KNowledge } from '../models/knowledge';
import { MAX_FETCH_DAYS, MAX_FETCH_RECORDS, ONE_DAY_MS } from '@financial-ai/types';

const hubspotClient = new Client();

export async function getValidHubspotClient(userId: string) {
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
    if (user.hubspotSynching) return
    if (!user?.hubspotTokens || !user.hubspotTokens.access_token || !user.hubspotTokens.refresh_token) return
    try {
        const client = await getValidHubspotClient(userId);

        user.hubspotSynching = true
        await user.save()

        const lastRecNote = await KNowledge.aggregate([
            { $match: { userId, 'metadata.source': 'hubspot', 'metadata.type': 'note_chunk' } },
            { $group: { _id: null, last: { $max: '$timestamp' } } }
        ])

        const lastTimeNotes: number = lastRecNote.length ? lastRecNote[0].last : (Date.now() - ONE_DAY_MS * MAX_FETCH_DAYS)

        const notesSearch = await client.crm.objects.notes.searchApi.doSearch({
            filterGroups: [{
                filters: [{ propertyName: 'hs_timestamp', operator: FilterOperatorEnum.Gte, value: lastTimeNotes.toString() }]
            }],
            sorts: ['-hs_timestamp'],
            properties: ['hs_note_body', 'hs_timestamp'],
            limit: MAX_FETCH_RECORDS
        });

        for (const note of notesSearch.results) {
            const text = note.properties.hs_note_body || "";
            const modDate = new Date(note.properties.hs_timestamp).getTime();

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
            }, chunks, 'hubspot', modDate, note.id);
        }

        const lastRecContacts = await KNowledge.aggregate([
            { $match: { userId, 'metadata.source': 'hubspot', 'metadata.type': 'contact' } },
            { $group: { _id: null, last: { $max: '$timestamp' } } }
        ])

        const lastTimeContacts: number = lastRecContacts.length ? lastRecContacts[0].last : (Date.now() - ONE_DAY_MS * MAX_FETCH_DAYS)

        const contactSearch = await client.crm.contacts.searchApi.doSearch({
            filterGroups: [{
                filters: [{ propertyName: 'lastmodifieddate', operator: FilterOperatorEnum.Gte, value: lastTimeContacts.toString() }]
            }],
            sorts: ['-lastmodifieddate'],
            properties: ['hs_object_id', 'firstname', 'lastname', 'email', 'jobtitle', 'company', 'lifecyclestage', 'city', 'lastmodifieddate'],
            limit: MAX_FETCH_RECORDS
        });

        for (const contact of contactSearch.results) {
            const p = contact.properties;
            const modDate = new Date(p.lastmodifieddate).getTime();

            const contactInfo = `Contact: ${p.firstname} ${p.lastname} (${p.email}). ` +
                `Job Title: ${p.jobtitle || 'N/A'}. Company: ${p.company || 'N/A'}. ` +
                `Status: ${p.lifecyclestage}. Location: ${p.city || 'Unknown'}.`;

            await vectorizeAndStore(userId, {
                id: contact.id,
                from: p.email,
                subject: `${p.firstname} ${p.lastname}`,
                type: 'contact'
            }, [contactInfo], 'hubspot', modDate, p.hs_object_id);
        }
    } catch (e) {
        console.log(">>>Error when syncing hubspot", e)
    } finally {
        user.hubspotSynching = false
        await user.save()
    }
}