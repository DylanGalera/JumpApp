export type TKnowledge = {
    content: string;
    userId: string,
    embedding: number[];
    metadata: {
        source: 'gmail' | 'hubspot';
        externalId: string;
        clientEmail?: string;
        type?: string; // e.g., 'email-body', 'contact-note'
        subject?: string
    };
    createdAt: Date;
}