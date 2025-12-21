import { AssociationSpecAssociationCategoryEnum, FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/companies';
import { getValidHubspotClient } from '../services/hubspot.sync';

export async function addHubspotNote(
    userId: string,
    email: string,
    content: string
) {
    try {
        const hubspotClient = await getValidHubspotClient(userId);

        // 1. Search for the contact by email to get the ID
        const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
            filterGroups: [{
                filters: [{
                    propertyName: 'email',
                    operator: FilterOperatorEnum.Eq,
                    value: email
                }]
            }]
        });

        let contactId: string;

        if (searchResponse.total === 0) {
            // Option A: Create the contact if they don't exist
            const newContact = await hubspotClient.crm.contacts.basicApi.create({
                properties: { email }
            });
            contactId = newContact.id;
        } else {
            // Option B: Use the existing contact ID
            contactId = searchResponse.results[0].id;
        }

        // 2. Create the note and associate it with the found/created contact ID
        await hubspotClient.crm.objects.notes.basicApi.create({
            properties: {
                hs_note_body: content,
                hs_timestamp: Date.now().toString(),
            },
            associations: [
                {
                    to: { id: contactId },
                    types: [{
                        associationCategory: AssociationSpecAssociationCategoryEnum.HubspotDefined,
                        associationTypeId: 202 // Note to Contact
                    }]
                }
            ]
        });

        return `Note successfully added to contact: ${email}`;

    } catch (e: any) {
        console.error("--> HubSpot Note Error:", e.response?.body || e);
        return `Error adding note for ${email}: ${e.message}`;
    }
}