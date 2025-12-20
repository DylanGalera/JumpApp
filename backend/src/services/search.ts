import OpenAI from 'openai';
import { KNowledge } from '../models/knowledge';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class AiService {
    /**
     * Generates a 1536-dimension vector for a string of text
     */
    async generateEmbedding(text: string): Promise<number[]> {
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
        });
        return response.data[0].embedding;
    }

    /**
     * Performs RAG: Searches Atlas for relevant context
     */
    async searchContext(query: string, limit = 5) {
        const vector = await this.generateEmbedding(query);

        return await KNowledge.aggregate([
            {
                $vectorSearch: {
                    index: 'vector_index', // The name you set in Atlas UI
                    path: 'embedding',
                    queryVector: vector,
                    numCandidates: 100,
                    limit: limit,
                },
            },
            {
                $project: {
                    content: 1,
                    metadata: 1,
                    score: { $meta: 'vectorSearchScore' },
                },
            },
        ]);
    }
}