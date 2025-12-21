import OpenAI from 'openai';
import { Instruction } from '../models/instruction';
import { Task } from '../models/tasks';
import { IChatHistory } from '@financial-ai/types';

/*export const grogClient = new OpenAI({
    apiKey: process.env.GROG_API_KEY, // Groq/Mistral/OpenRouter Key
    baseURL: "https://api.groq.com/openai/v1" // Replace with provider's URL
});*/

export const geminiClient = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    // This URL allows you to use the OpenAI SDK with Gemini
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
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
    },
    {
        type: "function",
        function: {
            name: "send_client_email",
            description: "Sends a professional email to a client via Gmail.",
            parameters: {
                type: "object",
                properties: {
                    to: { type: "string", description: "Recipient email address" },
                    subject: { type: "string" },
                    body: { type: "string", description: "The full content of the email." }
                },
                required: ["to", "subject", "body"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "update_hubspot_contact",
            description: "Updates or creates a contact record in HubSpot.",
            parameters: {
                type: "object",
                properties: {
                    email: { type: "string" },
                    lifecycle_stage: { type: "string", enum: ["lead", "marketingqualifiedlead", "customer"] },
                    notes: { type: "string" }
                },
                required: ["email"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "create_calendar_event",
            description: "Schedules a new event or meeting in the user's Google Calendar.",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string", description: "The title/name of the event" },
                    start_datetime: { type: "string", description: "Start time in yyyymmddTHHMM format" },
                    duration: { type: "string", description: "Duration (e.g., '1h', '30m', '1d')" },
                    description: { type: "string", description: "Optional notes for the event" }
                },
                required: ["title", "start_datetime"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "add_hubspot_note",
            description: "Adds a note to a specific contact's timeline in HubSpot.",
            parameters: {
                type: "object",
                properties: {
                    contactId: { type: "string", description: "The numerical ID of the HubSpot contact" },
                    content: { type: "string", description: "The text content of the note" }
                },
                required: ["contactId", "content"]
            }
        }
    }
];

export async function callAiAPI(contextText: string, userId: string, history?: IChatHistory[]) {
    try {
        let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            {
                role: "system",
                content: `You are a proactive Financial Advisor AI. 
                You will receive information chunks prefixed with a structured tag: [METADATA: {json_string}]
          Context: ${contextText || "No context found."}`
            },
        ];

        history.forEach(h => messages.push({
            role: h.role == 'user' ? "user" : "assistant",
            content: h.content
        }))

        const response = await geminiClient.chat.completions.create({
            model: "gemini-flash-latest",
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
                } else if (toolCall.function.name === "create_task") {
                    await Task.create({ userId, ...args })
                    result = `Created task: ${args.title} due on ${args.due_date || 'not specified'}`;
                } else if (toolCall.function.name === "send_client_email") {
                    //await Task.create({ userId, ...args })
                    result = `Sent Client Email to ${args.title} due on ${args.due_date || 'not specified'}`;
                } else if (toolCall.function.name === "update_hubspot_contact") {
                    //await Task.create({ userId, ...args })
                    result = `Updated Hubspot Contact : ${args.title} due on ${args.due_date || 'not specified'}`;
                } else if (toolCall.function.name === "create_calendar_event") {
                    //await Task.create({ userId, ...args })
                    result = `Created Google Calendar Event: ${args.title} due on ${args.due_date || 'not specified'}`;
                } else if (toolCall.function.name === "add_hubspot_note") {
                    //await Task.create({ userId, ...args })
                    result = `Created hubspot task: ${args.title} due on ${args.due_date || 'not specified'}`;
                }
                // Add the Tool execution result back to messages
                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: result
                });
            }

            // 4. Final API Call to summarize the action to the user
            const finalResponse = await /*grogClient*/geminiClient.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: messages
            });

            return finalResponse.choices[0].message.content;
        }

        return responseMessage.content;
    } catch (error) {
        return error.message
        /*console.error('Error while asking Gemini:', error);
        throw new Error('Error in Gemini API');*/
    }
}
