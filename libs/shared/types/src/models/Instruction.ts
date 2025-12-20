import mongoose from "mongoose";

export type TInstruction = {
    userId: string,
    instruction: String,
    isActive: boolean,
    createdAt: Date
}