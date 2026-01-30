import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";

const requestSchema = z.object({
  theme: z.string().optional(),
});

/**
 * POST /api/prompt/suggest
 * 
 * Returns coloring page ideas. No hidden prompts.
 * Input: { theme?: string }
 * Output: { ideas: string[] }
 */
export async function POST(request: NextRequest) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { theme } = requestSchema.parse(body);

    const userMessage = theme
      ? `Give me 8 coloring page ideas related to: ${theme}`
      : `Give me 8 diverse coloring page ideas for kids`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `${userMessage}

Return a JSON array of strings. Each string is a complete prompt describing a coloring page scene.
Include in each prompt: subject, setting, composition, and style details.
Example format: ["A cute cat sitting on a windowsill looking at birds outside, simple line art, black outlines on white background", ...]

Return ONLY the JSON array, no other text.`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content || "[]";
    
    // Parse the JSON array
    let ideas: string[] = [];
    try {
      // Clean up the response
      let jsonStr = content.trim();
      if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
      if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
      jsonStr = jsonStr.trim();
      
      ideas = JSON.parse(jsonStr);
      if (!Array.isArray(ideas)) {
        ideas = [content]; // Fallback to raw content
      }
    } catch {
      // If parsing fails, split by newlines
      ideas = content.split("\n").filter(line => line.trim().length > 10);
    }

    return NextResponse.json({ ideas });

  } catch (error) {
    console.error("[prompt/suggest] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to suggest ideas" },
      { status: 500 }
    );
  }
}





