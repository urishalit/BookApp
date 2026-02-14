"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suggestBookMetadata = void 0;
const https_1 = require("firebase-functions/v2/https");
const genai_1 = require("@google/genai");
const PROMPT = `Look at this book cover. Return a JSON object with: 'title', 'author', 'series_name', and 'book_number_in_series'. If a series isn't mentioned, leave it null.`;
function extractJsonFromResponse(text) {
    var _a, _b, _c, _d;
    const trimmed = text.trim();
    const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonBlock ? jsonBlock[1].trim() : trimmed;
    const parsed = JSON.parse(jsonStr);
    return {
        title: (_a = parsed.title) !== null && _a !== void 0 ? _a : '',
        author: (_b = parsed.author) !== null && _b !== void 0 ? _b : '',
        series_name: (_c = parsed.series_name) !== null && _c !== void 0 ? _c : null,
        book_number_in_series: (_d = parsed.book_number_in_series) !== null && _d !== void 0 ? _d : null,
    };
}
exports.suggestBookMetadata = (0, https_1.onCall)({ enforceAppCheck: false }, async (request) => {
    var _a, _b, _c;
    const { imageBase64, mimeType } = (_a = request.data) !== null && _a !== void 0 ? _a : {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'imageBase64 is required');
    }
    if (!mimeType || typeof mimeType !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'mimeType is required');
    }
    const projectId = process.env.GCLOUD_PROJECT;
    const location = (_b = process.env.GOOGLE_CLOUD_LOCATION) !== null && _b !== void 0 ? _b : 'us-central1';
    if (!projectId) {
        throw new https_1.HttpsError('failed-precondition', 'Project ID not configured');
    }
    const client = new genai_1.GoogleGenAI({
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
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Vertex AI request failed';
        console.error('Vertex AI error:', message);
        throw new https_1.HttpsError('internal', `Failed to analyze cover: ${message}`);
    }
    const text = (_c = response === null || response === void 0 ? void 0 : response.text) === null || _c === void 0 ? void 0 : _c.trim();
    if (!text) {
        throw new https_1.HttpsError('internal', 'No response from model');
    }
    try {
        return extractJsonFromResponse(text);
    }
    catch (parseErr) {
        console.error('Parse error:', parseErr);
        throw new https_1.HttpsError('internal', 'Invalid response from model');
    }
});
//# sourceMappingURL=index.js.map