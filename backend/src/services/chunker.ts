import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
const clearHtml = (text: string): string => {
    return text
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};
export async function chunker(rawText: string): Promise<string[]> {
    const text = clearHtml(rawText)
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
        separators: ["\n\n", "\n", " "]
    });

    const chunks = await splitter.splitText(text);
    return chunks
}