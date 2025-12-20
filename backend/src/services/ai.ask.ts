import { KNowledge } from "../models/knowledge";
import { callAiAPI } from "./askGemni";
import { hfClient } from "./vectorize.service";


export async function askAiAgent(userId: string, question: string): Promise<string> {
    try {
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
        const contextText = contextDocs.map(doc => doc.content).join("\n\n");
        const response = await callAiAPI(contextText, question)
        return response
    } catch (e) {
        console.log("Error while asking AI:", e)
    }
}