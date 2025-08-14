const config = require('./config');

class ModelMapper {
  constructor(config) {
    this.config = config;
  }

  // Map the proxy model name to provider model names
  mapToProviderModel(proxyModelName, provider) {
    if (proxyModelName === this.config.proxyModelName) {
      return this.config.providerModels[provider];
    }
    return null; // Model not supported
  }

  // Map provider model names to proxy model name
  mapToProxyModel(providerModelName) {
    if (providerModelName === this.config.providerModels.cerebras || 
        providerModelName === this.config.providerModels.chutes) {
      return this.config.proxyModelName;
    }
    return null; // Model not recognized
  }

  // Get all available models for the proxy
  getAvailableModels() {
    return [
      {
        id: this.config.proxyModelName,
        object: "model",
        created: Math.floor(Date.now() / 1000),
        owned_by: "qwen-3-coder-proxy"
      }
    ];
  }
}

module.exports = ModelMapper;