const config = require('./config');

class Logger {
  constructor() {
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    this.currentLevel = this.levels[config.logLevel] || this.levels.INFO;
  }

  setLevel(level) {
    if (this.levels.hasOwnProperty(level)) {
      this.currentLevel = this.levels[level];
    }
  }

  log(level, message, data = null) {
    if (this.levels[level] <= this.currentLevel) {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        message
      };
      
      if (data) {
        // Safely serialize data to avoid circular reference errors
        try {
          logEntry.data = data;
          console.log(JSON.stringify(logEntry));
        } catch (serializeError) {
          // If serialization fails due to circular references,
          // create a simplified version of the data
          const simplifiedData = {};
          for (const key in data) {
            if (data.hasOwnProperty(key)) {
              try {
                // Try to serialize each property individually
                JSON.stringify(data[key]);
                simplifiedData[key] = data[key];
              } catch (propError) {
                // If a property can't be serialized, use its string representation
                simplifiedData[key] = String(data[key]);
              }
            }
          }
          logEntry.data = simplifiedData;
          console.log(JSON.stringify(logEntry));
        }
      } else {
        console.log(JSON.stringify(logEntry));
      }
    }
  }

  error(message, data) {
    this.log('ERROR', message, data);
  }

  warn(message, data) {
    this.log('WARN', message, data);
  }

  info(message, data) {
    this.log('INFO', message, data);
  }

  debug(message, data) {
    this.log('DEBUG', message, data);
  }
}

module.exports = new Logger();