#!/usr/bin/env node
/**
 * Extract book metadata from a cover image using Vertex AI (Gemini).
 *
 * Usage:
 *   node extract-text.js <image_path>
 *   node extract-text.js path/to/cover.jpg
 *
 * Requires:
 *   - Google Cloud project with Vertex AI API enabled
 *   - Application Default Credentials (run: gcloud auth application-default login)
 *   - Env: GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION (optional, default: us-central1)
 */

const fs = require('fs');
const path = require('path');

const PROMPT = `Look at this book cover. Return a JSON object with: 'title', 'author', 'series_name', and 'book_number_in_series'. If a series isn't mentioned, leave it null.`;

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
  return mimeTypes[ext] || 'image/jpeg';
}

function extractJsonFromResponse(text) {
  const trimmed = text.trim();
  const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonBlock ? jsonBlock[1].trim() : trimmed;
  return JSON.parse(jsonStr);
}

function getProjectId(keyFilename) {
  if (process.env.GOOGLE_CLOUD_PROJECT) {
    return process.env.GOOGLE_CLOUD_PROJECT;
  }
  if (keyFilename) {
    const credPath = path.resolve(keyFilename);
    if (fs.existsSync(credPath)) {
      const cred = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      if (cred.project_id) return cred.project_id;
    }
  }
  return null;
}

async function analyzeBookCover(imagePath, { keyFilename = null } = {}) {
  const { GoogleGenAI } = require('@google/genai');

  if (keyFilename) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(keyFilename);
  }

  const resolvedPath = path.resolve(imagePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Image not found: ${imagePath}`);
  }

  const projectId = getProjectId(keyFilename);
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

  if (!projectId) {
    throw new Error(
      'Project ID required. Use GOOGLE_CLOUD_PROJECT env var, or pass --credentials with a service account JSON (project_id is read from the file).'
    );
  }

  const client = new GoogleGenAI({
    vertexai: true,
    project: projectId,
    location,
    apiVersion: 'v1',
  });

  const content = fs.readFileSync(resolvedPath);
  const imagePart = {
    inlineData: {
      data: content.toString('base64'),
      mimeType: getMimeType(resolvedPath),
    },
  };

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
    const msg = parseApiError(err);
    throw new Error(msg);
  }

  const text = response?.text?.trim();
  if (!text) {
    throw new Error('No response from model');
  }

  return extractJsonFromResponse(text);
}

function parseApiError(err) {
  const msg = err?.message || '';
  try {
    const parsed = JSON.parse(msg);
    const gcpMsg = parsed?.error?.message;
    if (gcpMsg) {
      const hint =
        gcpMsg.includes('disabled') || gcpMsg.includes('SERVICE_DISABLED')
          ? '\n\nEnable the Vertex AI API: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com'
          : '';
      return gcpMsg + hint;
    }
  } catch (_) {}
  return msg;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { image: null, credentials: null };

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--credentials' || args[i] === '-c') && args[i + 1]) {
      result.credentials = args[++i];
    } else if (!args[i].startsWith('-') && !result.image) {
      result.image = args[i];
    }
  }
  return result;
}

async function main() {
  const { image, credentials } = parseArgs();

  if (!image) {
    console.error('Usage: node extract-text.js <image_path> [--credentials <path>]');
    console.error('  --credentials, -c   Path to service account JSON key file');
    console.error('');
    console.error('Env: GOOGLE_CLOUD_PROJECT (required), GOOGLE_CLOUD_LOCATION (default: us-central1)');
    process.exit(1);
  }

  let result;
  try {
    result = await analyzeBookCover(image, { keyFilename: credentials });
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
}

main();
