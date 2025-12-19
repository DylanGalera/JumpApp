import express from 'express';
import { ROUTES_NAMES } from '@financial-ai/types'
import auth from './routes/auth'
import cors from 'cors'
import mongoose from 'mongoose';
import dotenv from 'dotenv';

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
app.use(
  cors({
    exposedHeaders: ['Content-Disposition'],
  }),
)
app.use(express.json({ limit: '600kb' }))

app.get('/', (req, res) => {
  res.send({ message: 'Hello API' });
});

app.listen(3000, 'localhost', () => {
  console.log(`[ ready ] http://localhost:3000`);
});

app.use(ROUTES_NAMES.AUTH.name, auth)