import OpenAI from 'openai';
import { Instruction } from '../models/instruction';
import { Task } from '../models/tasks';

export const grogClient = new OpenAI({
    apiKey: process.env.GROG_API_KEY, // Groq/Mistral/OpenRouter Key
    baseURL: "https://api.groq.com/openai/v1" // Replace with provider's URL
});

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
        type: "function",
        function: {
            name: "add_instruction",
            description: "Adds a business rule or permanent instruction for the advisor.",
            parameters: {
                type: "object",
                properties: {
                    content: { type: "string" },
                    category: { type: "string", enum: ["compliance", "workflow", "personal"] }
                },
                required: ["content"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "create_task",
            description: "Creates a new to-do item or task for the advisor.",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    due_date: { type: "string", description: "ISO 8601 date string" }
                },
                required: ["title"]
            }
        }
    }
];

export async function callAiAPI(contextText: string, question: string, userId: string) {
    try {
        let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            {
                role: "system",
                content: `You are a proactive Financial Advisor AI. 
          Context from HubSpot/Gmail: ${contextText || "No context found."}`
            },
            { role: "user", content: question }
        ];

        const response = await grogClient.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages,
            tools: tools,
        });

        const responseMessage = response.choices[0].message;

        // 3. Handle Tool Calls
        if (responseMessage.tool_calls) {
            // Add the AI's tool call request to the history
            messages.push(responseMessage);

            for (const toolCall of responseMessage.tool_calls) {
                if (toolCall.type != 'function') continue
                const args = JSON.parse(toolCall.function.arguments);
                let result = "";
                if (toolCall.function.name === "add_instruction") {
                    await Instruction.create({ userId, ...args })
                    result = `Successfully added instruction: ${args.content}`;
                }

                if (toolCall.function.name === "create_task") {
                    await Task.create({ userId, ...args })
                    result = `Created task: ${args.title} due on ${args.due_date || 'not specified'}`;
                }

                // Add the Tool execution result back to messages
                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: result
                });
            }

            // 4. Final API Call to summarize the action to the user
            const finalResponse = await grogClient.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: messages
            });

            return finalResponse.choices[0].message.content;
        }

        return responseMessage.content;
    } catch (error) {
        console.error('Error while asking Gemini:', error);
        throw new Error('Error in Gemini API');
    }
}
