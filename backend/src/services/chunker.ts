import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
export async function chunker(text: string): Promise<string[]> {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
        separators: ["\n\n", "\n", " "]
    });

    const chunks = await splitter.splitText(text);
    return chunks
}