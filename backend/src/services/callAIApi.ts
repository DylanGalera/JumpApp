import OpenAI from 'openai';

export const grogClient = new OpenAI({
    apiKey: process.env.GROG_API_KEY, // Groq/Mistral/OpenRouter Key
    baseURL: "https://api.groq.com/openai/v1" // Replace with provider's URL
});

export async function callAiAPI(contextText: string, question: string) {
    try {
        const response = await grogClient.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `You are a proactive Financial Advisor AI. 
          Context from HubSpot/Gmail: ${contextText || "No context found."}`
                },
                { role: "user", content: question }
            ],
        });

        return response.choices[0].message.content
    } catch (error) {
        console.error('Error while asking Gemini:', error);
        throw new Error('Error in Gemini API');
    }
}
