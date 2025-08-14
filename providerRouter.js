const axios = require('axios');
const logger = require('./logger');
const config = require('./config');

class ProviderRouter {
  constructor(rateLimitMonitor, modelMapper) {
    this.rateLimitMonitor = rateLimitMonitor;
    this.modelMapper = modelMapper;
    this.lastProvider = 'cerebras'; // Start with Cerebras as preferred provider
  }

  // Determine which provider to use for the request
  selectProvider() {
    // If we're within rate limits, use Cerebras (preferred)
    if (this.rateLimitMonitor.withinRateLimits()) {
      this.lastProvider = 'cerebras';
      logger.info('Selected provider: Cerebras', { 
        reason: 'Within rate limits', 
        usage: this.rateLimitMonitor.getUsageStats() 
      });
      return 'cerebras';
    }
    
    // Otherwise, use Chutes (fallback)
    this.lastProvider = 'chutes';
    logger.warn('Selected provider: Chutes', { 
      reason: 'Rate limits exceeded or in cooldown', 
      usage: this.rateLimitMonitor.getUsageStats() 
      });
    return 'chutes';
  }

  // Route a chat completion request to the appropriate provider
  async routeChatCompletion(requestBody) {
    const provider = this.selectProvider();
    const providerModel = this.modelMapper.mapToProviderModel(
      requestBody.model, 
      provider
    );
    
    if (!providerModel) {
      throw new Error(`Model ${requestBody.model} not supported for provider ${provider}`);
    }
    
    // Update the request body for the specific provider
    const modifiedRequestBody = this.adaptRequestForProvider(
      requestBody, 
      provider
    );
    
    // Update the model in the request body
    modifiedRequestBody.model = providerModel;
    
    logger.info('Routing request', { 
      provider, 
      model: requestBody.model,
      providerModel 
    });
    
    // Route to the selected provider
    if (provider === 'cerebras') {
      return await this.sendToCerebras(modifiedRequestBody);
    } else {
      return await this.sendToChutes(modifiedRequestBody);
    }
  }

  // Adapt request body for specific provider requirements
  adaptRequestForProvider(requestBody, provider) {
    const adaptedRequest = { ...requestBody };
    
    // Handle provider-specific adaptations for function calling
    if (provider === 'cerebras') {
      // Cerebras-specific adaptations
      // No specific adaptations needed at the moment
    } else if (provider === 'chutes') {
      // Chutes-specific adaptations
      // No specific adaptations needed at the moment
    }
    
    // Handle general function calling parameters
    if (adaptedRequest.tools || adaptedRequest.functions) {
      logger.info('Request includes function calling parameters', {
        hasTools: !!adaptedRequest.tools,
        hasFunctions: !!adaptedRequest.functions,
        provider
      });
    }
    
    return adaptedRequest;
  }

  // Adapt response from provider to ensure consistency
  adaptResponseFromProvider(response, provider) {
    // Handle provider-specific response adaptations for function calling
    if (provider === 'cerebras') {
      // Cerebras-specific response adaptations
      // No specific adaptations needed at the moment
    } else if (provider === 'chutes') {
      // Chutes-specific response adaptations
      // No specific adaptations needed at the moment
    }
    
    // Log function calling related response data
    if (response.choices && response.choices.length > 0) {
      const choice = response.choices[0];
      if (choice.message && (choice.message.tool_calls || choice.message.function_call)) {
        logger.info('Response includes function calling data', {
          hasToolCalls: !!choice.message.tool_calls,
          hasFunctionCall: !!choice.message.function_call,
          provider
        });
      }
    }
    
    return response;
  }

  // Send request to Cerebras
  async sendToCerebras(requestBody) {
    try {
      logger.info('Sending request to Cerebras', { 
        endpoint: config.endpoints.cerebras,
        hasTools: !!requestBody.tools,
        hasFunctions: !!requestBody.functions
      });
      
      const response = await axios.post(config.endpoints.cerebras, requestBody, {
        headers: {
          'Authorization': `Bearer ${config.cerebrasApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: config.requestTimeout
      });
      
      logger.info('Received response from Cerebras', { 
        status: response.status,
        statusText: response.statusText,
        hasToolCalls: response.data.choices && response.data.choices[0] && 
                      response.data.choices[0].message && 
                      !!response.data.choices[0].message.tool_calls,
        hasFunctionCall: response.data.choices && response.data.choices[0] && 
                         response.data.choices[0].message && 
                         !!response.data.choices[0].message.function_call
      });
      
      // Check if we got a rate limit error
      if (response.status === 429) {
        logger.warn('Cerebras rate limit exceeded');
        this.rateLimitMonitor.setCooldown();
        throw new Error('Cerebras rate limit exceeded');
      }
      
      // Adapt the response
      const adaptedResponse = this.adaptResponseFromProvider(response.data, 'cerebras');
      
      return {
        provider: 'cerebras',
        response: adaptedResponse,
        status: response.status
      };
    } catch (error) {
      logger.error('Error sending request to Cerebras', { 
        error: error.message,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : null
      });
      
      // If it's a rate limit error, set cooldown
      if (error.response && error.response.status === 429) {
        logger.warn('Setting cooldown due to Cerebras rate limit');
        this.rateLimitMonitor.setCooldown();
      }
      
      throw error;
    }
  }

  // Send request to Chutes
  async sendToChutes(requestBody) {
    try {
      logger.info('Sending request to Chutes', { 
        endpoint: config.endpoints.chutes,
        hasTools: !!requestBody.tools,
        hasFunctions: !!requestBody.functions
      });
      
      const response = await axios.post(config.endpoints.chutes, requestBody, {
        headers: {
          'Authorization': `Bearer ${config.chutesApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: config.requestTimeout
      });
      
      logger.info('Received response from Chutes', { 
        status: response.status,
        statusText: response.statusText,
        hasToolCalls: response.data.choices && response.data.choices[0] && 
                      response.data.choices[0].message && 
                      !!response.data.choices[0].message.tool_calls,
        hasFunctionCall: response.data.choices && response.data.choices[0] && 
                         response.data.choices[0].message && 
                         !!response.data.choices[0].message.function_call
      });
      
      // Adapt the response
      const adaptedResponse = this.adaptResponseFromProvider(response.data, 'chutes');
      
      return {
        provider: 'chutes',
        response: adaptedResponse,
        status: response.status
      };
    } catch (error) {
      logger.error('Error sending request to Chutes', { 
        error: error.message,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : null
      });
      
      throw error;
    }
  }
}

module.exports = ProviderRouter;