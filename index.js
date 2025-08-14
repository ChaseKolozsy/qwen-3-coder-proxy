const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import config and logger
const config = require('./config');
const logger = require('./logger');

// Import routes
const openaiRoutes = require('./routes/openai');

const app = express();
const PORT = config.port;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.get('/', (req, res) => {
  logger.info('Root endpoint accessed');
  res.json({ message: 'Qwen-3-Coder Proxy Server' });
});

// OpenAI-compatible routes
app.use('/v1', openaiRoutes);

// Start server
app.listen(PORT, () => {
  logger.info(`Qwen-3-Coder Proxy Server is running on port ${PORT}`);
  logger.info('OpenAI-compatible endpoints available at /v1');
});