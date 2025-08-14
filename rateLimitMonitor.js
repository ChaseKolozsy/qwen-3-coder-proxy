class RateLimitMonitor {
  constructor(config) {
    this.config = config;
    this.requestTimestamps = []; // For tracking requests per minute
    this.tokenCounts = []; // For tracking tokens per minute
    this.dailyTokenCount = 0; // For tracking tokens per day
    this.lastReset = Date.now();
    this.cooldownUntil = 0; // Timestamp until which we should use Chutes
  }

  // Add a request with token count
  addRequest(tokenCount) {
    const now = Date.now();
    
    // Clean up old entries (older than 1 minute)
    this.requestTimestamps = this.requestTimestamps.filter(timestamp => now - timestamp < 60000);
    this.tokenCounts = this.tokenCounts.filter(entry => now - entry.timestamp < 60000);
    
    // Add new entry
    this.requestTimestamps.push(now);
    this.tokenCounts.push({ timestamp: now, tokens: tokenCount });
    
    // Update daily token count
    this.dailyTokenCount += tokenCount;
    
    // Reset daily count if a day has passed
    if (now - this.lastReset > 24 * 60 * 60 * 1000) {
      this.dailyTokenCount = tokenCount;
      this.lastReset = now;
    }
  }

  // Check if we're within rate limits
  withinRateLimits() {
    const now = Date.now();
    
    // Check if we're in cooldown period
    if (now < this.cooldownUntil) {
      return false;
    }
    
    // Check requests per minute
    const recentRequests = this.requestTimestamps.filter(timestamp => now - timestamp < 60000).length;
    if (recentRequests >= this.config.rateLimits.cerebras.requestsPerMinute) {
      return false;
    }
    
    // Check tokens per minute
    const recentTokens = this.tokenCounts
      .filter(entry => now - entry.timestamp < 60000)
      .reduce((sum, entry) => sum + entry.tokens, 0);
    if (recentTokens >= this.config.rateLimits.cerebras.tokensPerMinute) {
      return false;
    }
    
    // Check tokens per day
    if (this.dailyTokenCount >= this.config.rateLimits.cerebras.tokensPerDay) {
      return false;
    }
    
    return true;
  }

  // Set cooldown period when hitting rate limits
  setCooldown() {
    this.cooldownUntil = Date.now() + this.config.cooldownPeriod;
  }

  // Check if cooldown period has ended
  isCooldownEnded() {
    return Date.now() >= this.cooldownUntil;
  }

  // Get current usage statistics
  getUsageStats() {
    const now = Date.now();
    const recentRequests = this.requestTimestamps.filter(timestamp => now - timestamp < 60000).length;
    const recentTokens = this.tokenCounts
      .filter(entry => now - entry.timestamp < 60000)
      .reduce((sum, entry) => sum + entry.tokens, 0);
    
    return {
      requestsPerMinute: {
        current: recentRequests,
        limit: this.config.rateLimits.cerebras.requestsPerMinute
      },
      tokensPerMinute: {
        current: recentTokens,
        limit: this.config.rateLimits.cerebras.tokensPerMinute
      },
      tokensPerDay: {
        current: this.dailyTokenCount,
        limit: this.config.rateLimits.cerebras.tokensPerDay
      },
      cooldownActive: now < this.cooldownUntil,
      cooldownRemaining: Math.max(0, this.cooldownUntil - now)
    };
  }
}

module.exports = RateLimitMonitor;