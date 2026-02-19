import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import surveyRoutes from './routes.js';
import authRoutes from './authRoutes.js';
import vacationRoutes from './vacationRoutes.js';
import Admin from './Admin.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// MongoDB connection (reuse across Vercel serverless invocations)
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
  console.log('Connected to MongoDB Atlas');

  // Seed default admin if none exists
  const existingAdmin = await Admin.findOne();
  if (!existingAdmin) {
    await Admin.create({ username: 'admin', password: 'azka2024' });
    console.log('Default admin created');
  }
}

// Ensure DB is connected before any route
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'AZKA Firmware Survey API is running' });
});

// Routes
app.use('/api/surveys', surveyRoutes);
app.use('/api/vacations', vacationRoutes);
app.use('/api/auth', authRoutes);

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// For Vercel
export default app;
