import { AssociationSpecAssociationCategoryEnum } from '@hubspot/api-client/lib/codegen/crm/companies';
import { User } from '../models/users';
import { getValidHubspotClient } from '../services/hubspot.sync';

export async function addHubspotContact(
    userId: string,
    email: string,
    firstName?: string,
    lastName?: string,
    notes?: string
) {
    try {
        // 1. Get the authenticated HubSpot client
        const hubspotClient = await getValidHubspotClient(userId);

        // 2. Prepare contact properties
        const properties = {
            email: email,
            firstname: firstName || '',
            lastname: lastName || '',
        };

        // 3. Create the contact in HubSpot
        const createContactResponse = await hubspotClient.crm.contacts.basicApi.create({
            properties
        });

        const contactId = createContactResponse.id;
        let resultMessage = `Contact created successfully with ID: ${contactId}`;

        // 4. If notes were provided, create a note and associate it with the new contact
        if (notes && contactId) {
            await hubspotClient.crm.objects.notes.basicApi.create({
                properties: {
                    hs_note_body: notes,
                    hubspot_owner_id: undefined // Optional: set an owner ID if needed
                },
                associations: [
                    {
                        to: { id: contactId },
                        types: [{ associationCategory: AssociationSpecAssociationCategoryEnum.HubspotDefined, associationTypeId: 202 }] // 202 is Note to Contact
                    }
                ]
            });
            resultMessage += " and note was attached.";
        }

        return resultMessage;

    } catch (e: any) {
        console.error("--> HubSpot Error:", e.response?.body || e);

        // Handle case where contact already exists
        if (e.response?.status === 409) {
            return `Error: A contact with the email ${email} already exists in HubSpot.`;
        }

        return `Error in adding contact to HubSpot: ${e.message}`;
    }
}