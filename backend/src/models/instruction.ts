import { TInstruction } from "@financial-ai/types";
import mongoose from "mongoose";

const instructionSchema = new mongoose.Schema<TInstruction>({
    userId: String,
    instruction: String,   // e.g., "If someone not in HubSpot emails me, add them."
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

export const Instruction = mongoose.model<TInstruction>('Instructions', instructionSchema);