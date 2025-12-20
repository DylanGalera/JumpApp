import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import * as cheerio from 'cheerio';
import { Element, AnyNode } from 'domhandler';

const clearHtml = (text: string): string => {
    const $ = cheerio.load(text);
    $('script, style, head, nav, footer').remove();

    let orderedContent = "";

    $('body').contents().each((_, node: AnyNode) => {
        // 1. Handle Text Nodes
        if (node.type === 'text') {
            orderedContent += (node as any).data;
        }

        // 2. Handle Element Nodes (where tagName exists)
        else if (node.type === 'tag') {
            const el = node as Element; // Cast to Element now that we know it's a tag
            const tagName = el.tagName.toLowerCase();

            if (tagName === 'a') {
                const linkText = $(el).text().trim();
                const href = $(el).attr('href');
                orderedContent += ` [${linkText}](${href}) `;
            } else {
                const isBlock = ['p', 'div', 'br', 'h1', 'h2', 'li'].includes(tagName);
                const content = $(el).text().trim();
                if (content) {
                    orderedContent += isBlock ? `\n${content}\n` : content;
                }
            }
        }
    });

    return orderedContent.replace(/[ \t]+/g, ' ').trim();
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