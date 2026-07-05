import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type EnvConfig = {
  googleGeminiApiKey: string;
  googleGeminiApiKeySource: string;
  googleGeminiModel: string;
};

const readLocalEnv = (): Record<string, string> => {
  const envPath = resolve(process.cwd(), '.env');
  const values: Record<string, string> = {};

  if (!existsSync(envPath)) return values;

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/u);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    values[key] = rawValue.replace(/^["']|["']$/gu, '').trim();
  }

  return values;
};

const localEnv = readLocalEnv();

type EnvLookup = {
  value: string;
  source: string;
};

const getOptionalEnv = (keys: string[], fallback: string): EnvLookup => {
  for (const key of keys) {
    const processValue = process.env[key]?.trim();
    if (processValue) return { value: processValue, source: `process.env.${key}` };

    const localValue = localEnv[key]?.trim();
    if (localValue) return { value: localValue, source: `.env:${key}` };
  }

  return { value: fallback, source: 'fallback placeholder' };
};

const geminiApiKey = getOptionalEnv(['GOOGLE_GEMINI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GEMINI_KEY'], 'your_google_gemini_api_key_here');
const geminiModel = getOptionalEnv(['GOOGLE_GEMINI_MODEL', 'GEMINI_MODEL'], 'gemini-2.5-flash');

export const env: EnvConfig = {
  googleGeminiApiKey: geminiApiKey.value,
  googleGeminiApiKeySource: geminiApiKey.source,
  googleGeminiModel: geminiModel.value,
};
