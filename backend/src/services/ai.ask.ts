import { IChatHistory } from "@financial-ai/types";
import { KNowledge } from "../models/knowledge";
import { callAiAPI } from "./callAIApi";
import { hfClient } from "./vectorize.service";


export async function askAiAgent(userId: string, history: IChatHistory[]): Promise<string> {
    try {
        const users = history.filter(a => a.role == 'user')
        if (!users.length) return ''
        const question = users[users.length - 1].content
        const questionEmbedding = await hfClient.featureExtraction({
            model: "sentence-transformers/all-MiniLM-L6-v2",
            inputs: question,
            provider: "hf-inference"
        }) as number[];

        if (!Array.isArray(questionEmbedding)) {
            throw new Error("Embedding not in the expected format");
        }

        const contextDocs = await KNowledge.aggregate([
            {
                $vectorSearch: {
                    index: "vector_index",
                    path: "embedding",
                    queryVector: questionEmbedding,
                    numCandidates: 100,
                    limit: 5,
                    filter: { userId: userId }
                }
            }
        ]);

        const contextText = contextDocs.map(doc => `[METADATA:${JSON.stringify(doc.metadata)}]\nCONTENT:${doc.content}`).join("\n\n");
        const response = await callAiAPI(contextText, userId, history)
        return response
    } catch (e) {
        console.log("Error while asking AI:", e)
    }
}