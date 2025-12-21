import OpenAI from 'openai';
import { Instruction } from '../models/instruction';
import { Task } from '../models/tasks';
import { IChatHistory } from '@financial-ai/types';
import { vectorize } from '../tools/vectorizer';
import { KNowledge } from '../models/knowledge';
import { sendEmail } from '../tools/sendemail';
import { setCalendarEvent } from '../tools/setEvent';
import { addHubspotContact } from '../tools/addContact';
import { first } from 'cheerio/dist/commonjs/api/traversing';

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
                    firstName: { type: 'string', description: 'name of contact' },
                    lastName: { type: 'string', description: 'last name of contact' },
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
                    start_datetime: { type: "string", description: "Start time in ISO format" },
                    duration: { type: "string", description: "Duration (e.g., '1h', '30m', '1d'), default value is 30 minutes." },
                    description: { type: "string", description: "Optional notes for the event, leave it blank if there is no description." }
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
    },
    {
        type: "function",
        function: {
            name: "search_knowledge_base",
            description: "Searches the database for emails, notes, or client information based on a query string.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "The specific topic or question to search for (e.g., 'Greg's investment goals')" }
                },
                required: ["query"]
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

        return await Api(userId, messages)

    } catch (error) {
        if (error.message == '429 status code (no body)') return 'Probably you reached to daily limit of AI Api, please try later.'
        return error.message
    }
}

export async function Api(userId: string, messages: any[]): Promise<string | null> {
    while (true) {
        const response = await geminiClient.chat.completions.create({
            model: "gemini-flash-latest",
            messages: messages,
            tools: tools,
        });

        const responseMessage = response.choices[0].message;

        // If the model did not call a tool, return its text content
        if (!responseMessage.tool_calls) {
            return responseMessage.content;
        }

        // Add the Assistant's tool call to the conversation history
        messages.push(responseMessage);

        // Process all tool calls (potentially in parallel)
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
                const { to, subject, body } = args
                result = await sendEmail(userId, to, subject, body)
            } else if (toolCall.function.name === "update_hubspot_contact") {
                const { email, firstName, lastName, notes } = args
                result = await addHubspotContact(userId, email, firstName, lastName, notes)
            } else if (toolCall.function.name === "create_calendar_event") {
                const { title, start_datetime, duration, description } = args
                result = await setCalendarEvent(userId, title, start_datetime, duration, description)
            } else if (toolCall.function.name === "add_hubspot_note") {
                const { contactId, content } = args
                result = `Created hubspot task: ${args.title} due on ${args.due_date || 'not specified'}`;
            } else if (toolCall.function.name === "search_knowledge_base") {
                const { query } = args;
                // 1. Vectorize the AI's search query
                const queryEmbedding = await vectorize(query);
                // 2. Perform the MongoDB Vector Search
                const results = await KNowledge.aggregate([
                    {
                        $vectorSearch: {
                            index: "vector_index",
                            path: "embedding",
                            queryVector: queryEmbedding,
                            numCandidates: 100,
                            limit: 5
                        }
                    }
                ]);
                // 3. Return the text chunks back to the AI
                result = results.map(r => r.content).join("\n---\n");
            }
            // Add the Tool execution result back to messages
            messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: result
            });
        }
        // The loop continues, sending the results back to the AI for the next step
    }
}
