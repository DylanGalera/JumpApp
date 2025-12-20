import { TInstruction } from "@financial-ai/types";
import mongoose, { Schema } from "mongoose";

const instructionSchema = new mongoose.Schema<TInstruction>({
    userId: { type: String, ref: 'User', required: true, index: true },
    content: { type: String, required: true },
    category: {
        type: String,
        enum: ['compliance', 'workflow', 'personal'],
        default: 'workflow'
    },
    embedding: {
        type: [Number],
        required: true // This is the field MongoDB Vector Search will look at
    },
    createdAt: { type: Date, default: Date.now }
});

export const Instruction = mongoose.model<TInstruction>('Instructions', instructionSchema);