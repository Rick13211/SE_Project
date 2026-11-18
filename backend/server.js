import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './src/routes/authRoutes.js';
import projectRoutes from './src/routes/projectRoutes.js';
import taskRoutes from './src/routes/taskRoutes.js';
import allocationRoutes from './src/routes/allocationRoutes.js';
import reassignmentRoutes from './src/routes/reassignmentRoutes.js';
import performanceRoutes from './src/routes/performanceRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import analyticsRoutes from './src/routes/analyticsRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${req.method} ${req.url}`);
  next();
});

// Serve frontend static assets if available
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/allocation', allocationRoutes);
app.use('/api/reassignment', reassignmentRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Intelligent Task Management Backend',
    timestamp: new Date().toISOString()
  });
});

// Single Page Application Fallback (Express 5 compatible catch-all)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    const indexPath = path.join(publicDir, 'index.html');
    return res.sendFile(indexPath);
  }
  next();
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).json({
    error: 'Internal server error occurred.',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`🚀 Smart Task Allocation & Workload Management Backend running!`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`================================================================`);
});

