# Image Generation Service

## ⚠️ STRICT RULE: OpenAI Only

This codebase uses **ONLY OpenAI (DALL-E 3)** for image generation.

### Forbidden Providers
- ❌ Replicate
- ❌ Stability AI / Stable Diffusion
- ❌ SDXL
- ❌ Midjourney
- ❌ Any other image generation provider

### Where Image Generation Lives

**Single source of truth:** `lib/services/openaiImageGen.ts`

All image generation in this codebase MUST go through:
```typescript
import { generateImage } from "@/lib/services/openaiImageGen";

const result = await generateImage({
  prompt: "your prompt here",
  n: 1,
  size: "1024x1536",
});
```

### API Endpoint

**Primary endpoint:** `POST /api/image/generate`

```json
{
  "prompt": "string (required) - EXACT prompt sent to DALL-E",
  "n": "number (optional, default 1)",
  "size": "1024x1024 | 1024x1536 | 1536x1024 | auto",
  "quality": "standard | hd",
  "style": "natural | vivid"
}
```

Returns:
```json
{
  "images": ["base64 encoded image strings"],
  "revisedPrompts": ["optional: if DALL-E revised the prompt"]
}
```

### No Hidden Prompts Rule

The `prompt` parameter is the **single source of truth**.

- ✅ The prompt is sent EXACTLY as provided
- ❌ No system prompts are injected
- ❌ No automatic style modifications
- ❌ No hidden suffix or prefix additions

### Environment Variables

Only one key is needed:

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxx
```

Never set these (will trigger a warning):
- `REPLICATE_API_TOKEN`
- `STABILITY_API_KEY`
- `MIDJOURNEY_API_KEY`

### To Change Providers

If you ever need to switch providers:

1. Modify ONLY `lib/services/openaiImageGen.ts`
2. Keep the same interface (`generateImage`, `editImage`)
3. Update this README

All other code calls this service, so changes propagate automatically.

### Provider Guard

A runtime check exists to verify configuration:

```typescript
import { assertOpenAIOnlyProvider } from "@/lib/services/openaiImageGen";

assertOpenAIOnlyProvider(); // Logs warnings if other providers are configured
```

This runs automatically in the `/api/image/generate` endpoint.

