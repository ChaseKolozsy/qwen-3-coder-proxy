# Qwen-3-Coder Proxy Server

A proxy server that routes between Cerebras and Chutes for the Qwen-3-Coder model. This proxy provides an OpenAI-compatible API interface while automatically handling provider selection based on rate limits and availability.

## Features

- OpenAI-compatible API endpoints
- Automatic routing between Cerebras (preferred) and Chutes (fallback)
- Rate limit monitoring and management
- Automatic fallback when Cerebras rate limits are approached
- Model name mapping between providers
- Function calling support
- Comprehensive logging and error handling

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Cerebras API key
- Chutes API key

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd qwen-3-coder-proxy
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env file with your API keys and configuration
   ```

## Configuration

The proxy can be configured using environment variables. Create a `.env` file based on the `.env.example` template:

```env
# Server configuration
PORT=3000
LOG_LEVEL=INFO

# API keys (required)
CEREBRAS_API_KEY=your_cerebras_api_key
CHUTES_API_KEY=your_chutes_api_key

# Model names (optional, defaults provided)
CEREBRAS_MODEL_NAME=qwen-3-coder-480b
CHUTES_MODEL_NAME=Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8
PROXY_MODEL_NAME=qwen-3-coder

# Rate limits (optional, defaults provided)
CEREBRAS_REQUESTS_PER_MINUTE=12
CEREBRAS_TOKENS_PER_MINUTE=132000
CEREBRAS_TOKENS_PER_DAY=19200000
COOLDOWN_PERIOD=300000
REQUEST_TIMEOUT=30000
```

## Usage

1. Start the server:
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

2. The server will start on the configured port (default: 3000)

## OpenAI-Compatible Base URL

To use this proxy with OpenAI-compatible tools (like roocode), set the base URL to:
```
http://localhost:3000/v1
```

For example, with roocode or other tools that support custom OpenAI endpoints:
- **Base URL**: `http://localhost:3000/v1`
- **API Key**: Any non-empty string (the proxy doesn't validate the API key)
- **Model**: `qwen-3-coder`

### Example Configuration for roocode

In your roocode configuration, set:
```json
{
  "baseUrl": "http://localhost:3000/v1",
  "model": "qwen-3-coder"
}
```

Note: The API key can be any value as the proxy doesn't validate it, but it must be provided as some tools require it.

## API Endpoints

The proxy provides OpenAI-compatible endpoints:

### GET /v1/models

List available models.

```bash
curl http://localhost:3000/v1/models
```

Response:
```json
{
  "object": "list",
  "data": [
    {
      "id": "qwen-3-coder",
      "object": "model",
      "created": 1723670000,
      "owned_by": "qwen-3-coder-proxy"
    }
  ]
}
```

### POST /v1/chat/completions

Create a chat completion. The proxy will automatically route the request to either Cerebras or Chutes based on availability and rate limits.

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen-3-coder",
    "messages": [
      {
        "role": "user",
        "content": "Tell me a 250 word story."
      }
    ],
    "stream": false,
    "max_tokens": 1024,
    "temperature": 0.7
  }'
```

### Function Calling

The proxy supports function calling with both the `tools` parameter (newer format) and `functions` parameter (legacy format). These parameters are forwarded as-is to the providers:

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen-3-coder",
    "messages": [
      {
        "role": "user",
        "content": "What is the weather like in New York?"
      }
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_current_weather",
          "description": "Get the current weather in a given location",
          "parameters": {
            "type": "object",
            "properties": {
              "location": {
                "type": "string",
                "description": "The city and state, e.g. San Francisco, CA"
              }
            },
            "required": ["location"]
          }
        }
      }
    ],
    "tool_choice": "auto"
  }'
```

## How It Works

1. **Provider Selection**: The proxy prefers Cerebras as the primary provider.
2. **Rate Limit Monitoring**: It monitors usage to ensure Cerebras rate limits are not exceeded:
   - Requests per minute: 12 (80% of 15)
   - Tokens per minute: 132,000 (80% of 165,000)
   - Tokens per day: 19,200,000 (80% of 24,000,000)
3. **Automatic Fallback**: When Cerebras rate limits are approached or exceeded, the proxy automatically switches to Chutes.
4. **Cooldown Period**: After hitting a rate limit, the proxy waits for a cooldown period (default: 5 minutes) before trying Cerebras again.
5. **Model Mapping**: The proxy handles model name mapping between the providers.
6. **Function Calling**: The proxy forwards function calling parameters (`tools` and `functions`) to the providers without modification.

## Rate Limit Handling

The proxy implements the following rate limit handling strategies:

1. **Proactive Monitoring**: Tracks requests and tokens to prevent hitting limits
2. **Reactive Handling**: Responds to 429 (rate limit) errors from providers
3. **Cooldown Period**: Implements a cooldown period after rate limit errors
4. **Automatic Switching**: Automatically switches between providers based on availability

## Function Calling Support

The proxy supports function calling for both Cerebras and Chutes:

- **Tools Parameter**: The newer format using the `tools` parameter is supported
- **Functions Parameter**: The legacy format using the `functions` parameter is supported
- **Forwarding**: Function calling parameters are forwarded as-is to the providers
- **Response Handling**: Responses with function calling data are returned unchanged

Note: The exact behavior of function calling may vary between providers. The proxy forwards requests and responses without modification, so any provider-specific differences in function calling behavior will be preserved.

## Logging

The proxy provides comprehensive logging for monitoring and debugging:

- Request/response logging
- Provider selection decisions
- Rate limit status
- Function calling parameters and responses
- Error conditions

Log level can be configured using the `LOG_LEVEL` environment variable (ERROR, WARN, INFO, DEBUG).

## Testing

To test the proxy:

1. Ensure you have valid API keys in your `.env` file
2. Start the server: `npm start`
3. Test the models endpoint: `curl http://localhost:3000/v1/models`
4. Test the chat completions endpoint with the example curl command above

## License

MIT