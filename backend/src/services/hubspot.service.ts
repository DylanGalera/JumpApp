import { Client } from '@hubspot/api-client';
import { FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/contacts';

export class HubspotService {
    private hubspotClient: Client;

    constructor(accessToken: string) {
        this.hubspotClient = new Client({ accessToken });
    }

    async findContactByEmail(email: string) {
        const publicObjectSearchRequest = {
            filterGroups: [
                {
                    filters: [
                        {
                            propertyName: 'email',
                            operator: FilterOperatorEnum.Eq,
                            value: email,
                        },
                    ],
                },
            ],
            properties: ['firstname', 'lastname', 'email'],
            limit: 1,
        };

        try {
            const response = await this.hubspotClient.crm.contacts.searchApi.doSearch(
                publicObjectSearchRequest
            );
            return response.results.length > 0 ? response.results[0] : null;
        } catch (error) {
            console.error('HubSpot Search Error:', error);
            throw error;
        }
    }

    /**
     * Requirement: "Create a contact in Hubspot"
     */
    async createContact(email: string, firstName: string, lastName: string) {
        const properties = {
            email,
            firstname: firstName,
            lastname: lastName,
        };

        try {
            return await this.hubspotClient.crm.contacts.basicApi.create({ properties });
        } catch (error) {
            console.error('HubSpot Create Error:', error);
            throw error;
        }
    }
}