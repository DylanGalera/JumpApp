import express from 'express';
import { ROUTES_NAMES } from '@financial-ai/types'
import auth from './routes/auth'
import instruction from './routes/instruction'
import cors from 'cors'
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI as string);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1); // Exit process with failure
  }
};

connectDB();

const app = express();

app.use(cookieParser());

app.use(cors({
  origin: process.env.FRONT_URL, // Your exact frontend URL
  credentials: true,                // Required to allow the browser to receive/send cookies
  //exposedHeaders: ['Content-Disposition'],
}));

app.use(express.json({ limit: '600kb' }))

app.get('/', (req, res) => {
  res.send({ message: 'Hello API' });
});

app.listen(3000, 'localhost', () => {
  console.log(`[ ready ] http://localhost:3000`);
});

app.use(ROUTES_NAMES.AUTH.name, auth)
app.use(ROUTES_NAMES.INSTRUCTION.name, instruction)
