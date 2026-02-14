import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GoogleGenAI } from '@google/genai';

const PROMPT = `Look at this book cover. Return a JSON object with: 'title', 'author', 'series_name', and 'book_number_in_series'. If a series isn't mentioned, leave it null.`;

interface SuggestBookMetadataRequest {
  imageBase64: string;
  mimeType: string;
}

interface BookMetadataSuggestions {
  title: string;
  author: string;
  series_name: string | null;
  book_number_in_series: number | null;
}

function extractJsonFromResponse(text: string): BookMetadataSuggestions {
  const trimmed = text.trim();
  const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonBlock ? jsonBlock[1].trim() : trimmed;
  const parsed = JSON.parse(jsonStr);
  return {
    title: parsed.title ?? '',
    author: parsed.author ?? '',
    series_name: parsed.series_name ?? null,
    book_number_in_series: parsed.book_number_in_series ?? null,
  };
}

export const suggestBookMetadata = onCall<SuggestBookMetadataRequest>(
  { enforceAppCheck: false },
  async (request) => {
    const { imageBase64, mimeType } = request.data ?? {};

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      throw new HttpsError('invalid-argument', 'imageBase64 is required');
    }
    if (!mimeType || typeof mimeType !== 'string') {
      throw new HttpsError('invalid-argument', 'mimeType is required');
    }

    const projectId = process.env.GCLOUD_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1';

    if (!projectId) {
      throw new HttpsError('failed-precondition', 'Project ID not configured');
    }

    const client = new GoogleGenAI({
      vertexai: true,
      project: projectId,
      location,
      apiVersion: 'v1',
    });

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType,
      },
    };

    console.log('Calling Vertex AI Gemini for book cover analysis');
    let response;
    try {
      response = await client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [imagePart, PROMPT],
        config: {
          temperature: 0.1,
          maxOutputTokens: 256,
          responseMimeType: 'application/json',
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Vertex AI request failed';
      console.error('Vertex AI error:', message);
      throw new HttpsError('internal', `Failed to analyze cover: ${message}`);
    }

    const text = response?.text?.trim();
    if (!text) {
      throw new HttpsError('internal', 'No response from model');
    }

    try {
      const result = extractJsonFromResponse(text);
      console.log('Vertex AI response:', JSON.stringify(result));
      return result;
    } catch (parseErr) {
      console.error('Parse error:', parseErr);
      throw new HttpsError('internal', 'Invalid response from model');
    }
  }
);
