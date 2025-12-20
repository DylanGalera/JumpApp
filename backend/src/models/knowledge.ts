import { TKnowledge } from "@financial-ai/types";
import { Schema, model } from "mongoose";

const KnowledgeSchema = new Schema<TKnowledge>({
    content: { type: String, required: true },
    userId: { type: String, required: true },
    embedding: { type: [Number], required: true },
    metadata: {
        source: { type: String, enum: ['gmail', 'hubspot'], required: true },
        externalId: { type: String, required: true },
        clientEmail: { type: String },
        type: { type: String },
        subject: { type: String }
    },
    createdAt: { type: Date, default: Date.now },
});

export const KNowledge = model<TKnowledge>('KnowledgeBase', KnowledgeSchema);