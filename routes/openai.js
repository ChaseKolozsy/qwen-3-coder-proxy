const express = require('express');
const RateLimitMonitor = require('../rateLimitMonitor');
const ModelMapper = require('../modelMapper');
const ProviderRouter = require('../providerRouter');
const logger = require('../logger');
const config = require('../config');

const router = express.Router();

// Initialize components
const rateLimitMonitor = new RateLimitMonitor(config);
const modelMapper = new ModelMapper(config);
const providerRouter = new ProviderRouter(rateLimitMonitor, modelMapper);

// GET /v1/models - List available models
router.get('/models', (req, res) => {
  try {
    logger.info('GET /v1/models request received');
    const models = modelMapper.getAvailableModels();
    logger.info('Returning models', { count: models.length });
    res.json({
      object: "list",
      data: models
    });
  } catch (error) {
    logger.error('Error in GET /v1/models', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /v1/chat/completions - Chat completions endpoint
router.post('/chat/completions', async (req, res) => {
  try {
    logger.info('POST /v1/chat/completions request received');
    
    // Validate request
    if (!req.body.model) {
      logger.warn('Missing model parameter in request');
      return res.status(400).json({ error: 'Missing model parameter' });
    }
    
    // Check if model is supported
    if (req.body.model !== config.proxyModelName) {
      logger.warn('Unsupported model requested', { model: req.body.model });
      return res.status(400).json({ error: `Model ${req.body.model} not supported` });
    }
    
    // Log request details
    logger.info('Processing chat completion request', { 
      model: req.body.model,
      messagesCount: req.body.messages ? req.body.messages.length : 0
    });
    
    // Route the request
    const result = await providerRouter.routeChatCompletion(req.body);
    
    // If successful, track the usage
    if (result.status === 200 && result.provider === 'cerebras') {
      // Estimate token count (simplified)
      const tokenCount = req.body.max_tokens || 100;
      rateLimitMonitor.addRequest(tokenCount);
      logger.info('Added request to rate limit monitor', { tokenCount });
    }
    
    // Return the response from the provider
    logger.info('Returning response from provider', { 
      provider: result.provider,
      status: result.status
    });
    res.status(result.status).json(result.response);
  } catch (error) {
    logger.error('Error processing chat completion', { 
      error: error.message,
      stack: error.stack
    });
    
    // Handle rate limit errors
    if (error.message === 'Cerebras rate limit exceeded') {
      logger.warn('Returning 429 due to rate limit');
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    
    // Handle other errors
    if (error.response) {
      // Forward the error response from the provider
      logger.info('Forwarding provider error response', { 
        status: error.response.status 
      });
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// POST /v1/completions - Completions endpoint (legacy)
router.post('/completions', (req, res) => {
  logger.warn('POST /v1/completions requested (not supported)');
  res.status(400).json({ error: 'Completions endpoint not supported, use chat completions instead' });
});

module.exports = router;