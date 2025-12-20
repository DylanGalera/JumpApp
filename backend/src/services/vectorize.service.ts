import { InferenceClient } from '@huggingface/inference';
import { KNowledge } from '../models/knowledge';

export const hfClient = new InferenceClient(process.env.HF_TOKEN);

type RecordData = {
    id: string,
    subject: string,
    from: string
    type: 'contact' | 'note_chunk' | 'email_chunk'
}

export async function vectorizeAndStore(userId: string, recordData: RecordData, chunks: string[], source: 'gmail' | 'hubspot', timestamp: number, recordId: string) {
    let chunkId = 0
    for (const chunk of chunks) {
        chunkId++
        try {
            const embedding = await hfClient.featureExtraction({
                model: "sentence-transformers/all-MiniLM-L6-v2",
                inputs: chunk,
                provider: "hf-inference"
            }) as number[];

            await KNowledge.create({
                content: chunk,
                userId: userId,
                embedding: embedding,
                metadata: {
                    source,
                    externalId: recordData.id,
                    subject: recordData.subject,
                    clientEmail: recordData.from, // Extract this from headers
                    type: recordData.type
                },
                timestamp,
                uniqueId: `${source}_${recordData.type}_${recordId}_${chunkId}`
            });
        } catch {

        }
    }
}