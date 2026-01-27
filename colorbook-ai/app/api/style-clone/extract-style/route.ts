import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import { buildStyleExtractionPrompt } from "@/lib/styleClonePromptBuilder";
import type { StyleContract } from "@/lib/styleClone";

const requestSchema = z.object({
  referenceImageBase64: z.string().min(1, "Reference image is required"),
});

export async function POST(request: NextRequest) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { referenceImageBase64 } = parseResult.data;

    // Determine the image media type
    let mediaType = "image/png";
    if (referenceImageBase64.startsWith("/9j/")) {
      mediaType = "image/jpeg";
    } else if (referenceImageBase64.startsWith("iVBOR")) {
      mediaType = "image/png";
    }

    // Use GPT-4o for vision analysis (not an image generation model)
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: buildStyleExtractionPrompt(),
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mediaType};base64,${referenceImageBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let styleContract: StyleContract;
    try {
      const parsed = JSON.parse(content);
      
      // Validate and structure the response
      styleContract = {
        styleSummary: parsed.styleSummary || "Clean line art style",
        styleContractText: parsed.styleContractText || "Use clean black outlines on white background",
        forbiddenList: Array.isArray(parsed.forbiddenList) ? parsed.forbiddenList : [],
        recommendedLineThickness: ["thin", "medium", "bold"].includes(parsed.recommendedLineThickness) 
          ? parsed.recommendedLineThickness 
          : "medium",
        recommendedComplexity: ["simple", "medium", "detailed"].includes(parsed.recommendedComplexity)
          ? parsed.recommendedComplexity
          : "medium",
        outlineRules: parsed.outlineRules || "Medium weight outlines",
        backgroundRules: parsed.backgroundRules || "Simple or minimal background",
        compositionRules: parsed.compositionRules || "Centered subject with clear framing",
        eyeRules: parsed.eyeRules || "Small dot pupils, no solid black fills in eyes",
      };
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response as JSON" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      styleContract,
      debug: {
        model: "gpt-4o",
        tokensUsed: response.usage?.total_tokens,
      },
    });
  } catch (error) {
    console.error("Extract style error:", error);

    if (error instanceof Error) {
      if (error.message.includes("rate_limit")) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please wait and try again." },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to extract style" },
      { status: 500 }
    );
  }
}

