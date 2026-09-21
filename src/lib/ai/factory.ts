import "server-only";
import { getServerEnvironment } from "@/lib/env/server";
import { OpenAICompatibleMedicalExtractionProvider } from "./openai-compatible";

export function createMedicalExtractionProvider() {
  const environment = getServerEnvironment();
  if (environment.AI_PROVIDER !== "openai-compatible" || !environment.AI_API_URL || !environment.AI_API_KEY || !environment.AI_MODEL) {
    throw new Error("AI extraction is not configured.");
  }
  return new OpenAICompatibleMedicalExtractionProvider(environment.AI_API_URL, environment.AI_API_KEY, environment.AI_MODEL);
}
