export type TInstruction = {
    userId: string;
    content: string;         // The actual instruction text
    category: 'compliance' | 'workflow' | 'personal';
    embedding: number[];     // Array of 384 numbers for Vector Search
    createdAt: Date;
}