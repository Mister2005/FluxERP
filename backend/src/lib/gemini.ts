import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY not found. AI features will use fallback values.');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// List of models to try in order of preference
const MODEL_OPTIONS = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest', 
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
];

let cachedModel: any = null;
let workingModelName: string | null = null;

export function getGeminiModel() {
    if (cachedModel && workingModelName) {
        return cachedModel;
    }
    // Return first model option, will be tested on first call
    return genAI.getGenerativeModel({ model: MODEL_OPTIONS[0] });
}

export async function generateContent(prompt: string): Promise<string> {
    // Try each model until one works
    for (const modelName of MODEL_OPTIONS) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            // If successful, cache this model for future use
            cachedModel = model;
            workingModelName = modelName;
            console.log(`✅ Using Gemini model: ${modelName}`);
            return result.response.text();
        } catch (error: any) {
            if (error?.status === 404) {
                console.warn(`Model ${modelName} not available, trying next...`);
                continue;
            }
            // For non-404 errors, throw
            throw error;
        }
    }
    
    console.error('❌ All Gemini models failed. Check your API key.');
    throw new Error('No available Gemini models found');
}

export async function generateJSON<T>(prompt: string, fallback?: T): Promise<T> {
    try {
        const fullPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no explanations.`;
        const response = await generateContent(fullPrompt);
        let jsonText = response.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```\n?/g, '').replace(/```\n?$/g, '');
        }
        return JSON.parse(jsonText) as T;
    } catch (error) {
        console.error('Gemini JSON error:', error);
        // Return fallback if provided
        if (fallback !== undefined) {
            console.log('Using fallback response for AI analysis');
            return fallback;
        }
        throw new Error('Failed to parse AI response as JSON');
    }
}

export default { getGeminiModel, generateContent, generateJSON };
