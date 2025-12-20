import { InferenceClient } from '@huggingface/inference';
import { KNowledge } from '../models/knowledge';

const hf = new InferenceClient(process.env.HF_TOKEN);

type EmailData = {
    id: string,
    subject: string,
    from: string
    type: 'contact' | 'note_chunk' | 'email_chunk' | 'email_address'
}

export async function vectorizeAndStore(userId: string, emailData: EmailData, chunks: string[], source: 'gmail' | 'hubspot') {
    for (const chunk of chunks) {
        // 1. Generate Embedding
        const embedding = [] /*await hf.featureExtraction({
            model: "sentence-transformers/all-MiniLM-L6-v2",
            inputs: chunk,
            provider: "hf-inference"
        }) as number[];*/

        await KNowledge.create({
            content: chunk,
            userId: userId,
            embedding: embedding,
            metadata: {
                source,
                externalId: emailData.id,
                subject: emailData.subject,
                clientEmail: emailData.from, // Extract this from headers
                type: emailData.type
            }
        });
    }
}