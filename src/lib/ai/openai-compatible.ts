import "server-only";
import { medicalExtractionSchema, type MedicalExtraction, type MedicalExtractionInput, type MedicalExtractionProvider } from "./types";

const extractionPrompt = [
  "Extract only facts explicitly visible in this medical document.",
  "Do not diagnose, infer missing values, recommend treatment, or invent dates.",
  "Return JSON matching this exact shape:",
  '{"recordType":"PRESCRIPTION|LAB_REPORT|VISIT_NOTE|DISCHARGE_SUMMARY|OTHER","eventDate":"YYYY-MM-DD or null","providerName":"string or null","title":"short factual title","summary":"factual source summary or null","medications":[{"name":"string","instructions":"string or null"}],"confidence":0,"sourceNotes":["short notes about visible evidence"]}',
  "Use confidence from 0 to 1 for the overall extraction. Use null for unknown fields.",
].join("\n");

export class OpenAICompatibleMedicalExtractionProvider implements MedicalExtractionProvider {
  readonly name = "openai-compatible";

  constructor(private readonly endpoint: string, private readonly apiKey: string, readonly model: string) {}

  async extractMedicalDocument(input: MedicalExtractionInput): Promise<MedicalExtraction> {
    if (!["image/jpeg", "image/png"].includes(input.mimeType)) {
      throw new Error("This model provider currently supports JPEG and PNG medical documents only.");
    }

    const response = await fetch(`${this.endpoint.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model: this.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [{
          role: "user",
          content: [
            { type: "text", text: extractionPrompt },
            { type: "image_url", image_url: { url: `data:${input.mimeType};base64,${Buffer.from(input.bytes).toString("base64")}` } },
          ],
        }],
      }),
    });
    if (!response.ok) throw new Error(`AI provider request failed with status ${response.status}.`);
    const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI provider returned no structured extraction.");
    return medicalExtractionSchema.parse(JSON.parse(content));
  }
}
