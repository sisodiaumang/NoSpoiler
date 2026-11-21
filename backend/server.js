const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB, isConnected, isInMemoryFallback } = require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow Chrome extensions and Next.js frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/packs', require('./routes/packs'));
app.use('/api/keywords', require('./routes/keywords'));
app.use('/api/stats', require('./routes/stats'));

// Root / Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'NoSpoiler MERN API',
    database: isConnected() ? 'MongoDB Connected' : (isInMemoryFallback() ? 'In-Memory Store (Active)' : 'Connecting')
  });
});

// Start Server & Connect Database
const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`\n🚀 [NoSpoiler MERN API] Server running on http://localhost:${PORT}`);
    console.log(`   Health Check: http://localhost:${PORT}/api/health`);
    console.log(`   Packs Endpoint: http://localhost:${PORT}/api/packs\n`);
  });
};

start();
