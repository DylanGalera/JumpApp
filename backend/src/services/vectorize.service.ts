import { InferenceClient } from '@huggingface/inference';
import { KNowledge } from '../models/knowledge';
import { Instruction } from '../models/instruction';
import { Task } from '../models/tasks';
import { askAiAgent } from './ai.ask';

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
                    clientEmail: recordData.from,
                    type: recordData.type,
                    date: new Date(timestamp)
                },
                timestamp,
                uniqueId: `${source}_${recordData.type}_${recordId}_${chunkId}`
            });

            try {
                await processNewKnowledge(userId, chunk, recordData.type, source, recordData.subject, recordData.from, new Date(timestamp).toISOString());
            } catch (error) {
                console.error("Proactive processing failed:", error);
            }
        } catch {
        }
    }
}

export async function processNewKnowledge(userId: string, newChunk: string, dataType: string, source: string, subject: string, sender: string, date: string) {
    // 1. Fetch Rules (Instructions)
    const instructions = await Instruction.find({ userId });

    const pendingTasks = await Task.find({
        userId,
        status: 'pending'
    }).limit(10);

    const context = {
        instructions: instructions.map(i => i.content).join('\n'),
        existingTasks: pendingTasks.map(t => `- ${t.title} (ID: ${t._id})`).join('\n')
    };

    const prompt = `
        DATE: "${date}"

        SENDER: "${sender}"

        SUBJECT: "${subject}"

        DATA TYPE: "${dataType}"

        SOURCE: "${source}"

        NEW DATA RECEIVED: "${newChunk}"

        CURRENT INSTRUCTIONS:
        ${context.instructions}

        EXISTING PENDING TASKS:
        ${context.existingTasks}

        YOUR GOAL:
        1. If this data suggests a new action is needed AND it is NOT already in the 'Existing Tasks' list, use 'create_task'.
        2. If this data implies an 'Existing Task' is now finished, use a tool to mark it as complete.
        3. If no action is needed, reply 'No action'.
    `;

    return await askAiAgent(userId, [{
        content: prompt,
        role: 'user'
    }]);
}