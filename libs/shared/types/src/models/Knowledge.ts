export type TKnowledge = {
    content: string;
    userId: string,
    embedding: number[];
    metadata: {
        source: 'gmail' | 'hubspot' | 'calendar';
        externalId: string;
        clientEmail?: string;
        type?: string; // e.g., 'email-body', 'contact-note'
        subject?: string,
        date: Date
    };
    createdAt: Date;
    timestamp: number,
    uniqueId: string
}