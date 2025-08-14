// Validate required environment variables
const requiredEnvVars = ['CEREBRAS_API_KEY', 'CHUTES_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn(`Warning: Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.warn('Please set these in your .env file or environment.');
}

module.exports = {
  // Server configuration
  port: process.env.PORT || 3000,
  logLevel: process.env.LOG_LEVEL || 'INFO',
  
  // API keys
  cerebrasApiKey: process.env.CEREBRAS_API_KEY,
  chutesApiKey: process.env.CHUTES_API_KEY,
  
  // Provider model names
  providerModels: {
    cerebras: process.env.CEREBRAS_MODEL_NAME || 'qwen-3-coder-480b',
    chutes: process.env.CHUTES_MODEL_NAME || 'Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8'
  },
  
  // Proxy model name
  proxyModelName: process.env.PROXY_MODEL_NAME || 'qwen-3-coder',
  
  // Rate limit thresholds (80% of actual limits by default)
  rateLimits: {
    cerebras: {
      requestsPerMinute: parseInt(process.env.CEREBRAS_REQUESTS_PER_MINUTE) || 12,      // 80% of 15
      tokensPerMinute: parseInt(process.env.CEREBRAS_TOKENS_PER_MINUTE) || 132000,    // 80% of 165,000
      tokensPerDay: parseInt(process.env.CEREBRAS_TOKENS_PER_DAY) || 19200000      // 80% of 24,000,000
    }
  },
  
  // Provider endpoints
  endpoints: {
    cerebras: process.env.CEREBRAS_ENDPOINT || 'https://api.cerebras.ai/v1/chat/completions',
    chutes: process.env.CHUTES_ENDPOINT || 'https://llm.chutes.ai/v1/chat/completions'
  },
  
  // Cooldown period in milliseconds before switching back to Cerebras
  cooldownPeriod: parseInt(process.env.COOLDOWN_PERIOD) || 5 * 60 * 1000, // 5 minutes
  
  // Request timeout in milliseconds
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000 // 30 seconds
};