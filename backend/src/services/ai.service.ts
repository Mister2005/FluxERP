import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';
import { ServiceUnavailableError } from '../types/errors.js';

// ============================================================================
// Types
// ============================================================================

export interface ECORiskInput {
    title: string;
    description: string;
    type: string;
    priority: string;
    proposedChanges: Record<string, any>;
    product?: {
        sku: string;
        name: string;
        category: string;
    };
}

export interface RiskAnalysisResult {
    riskScore: number;
    predictedDelay: number;
    keyRisks: string[];
    recommendations: string[];
    impactAreas: string[];
    overallAssessment: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

// ============================================================================
// AI Service
// ============================================================================

export class AIService {
    private genAI: GoogleGenerativeAI | null = null;
    private model: GenerativeModel | null = null;
    private modelName: string = '';
    private initialized: boolean = false;
    private initializationPromise: Promise<void> | null = null;

    // Model fallback chain
    private readonly MODEL_OPTIONS = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-pro',
        'gemini-pro',
    ];

    constructor() {
        if (!config.geminiApiKey) {
            logger.warn('Gemini API key not configured - AI features will be disabled');
        }
    }

    /**
     * Initialize the AI model with fallback
     */
    private async initialize(): Promise<void> {
        if (this.initialized) return;
        
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._doInitialize();
        return this.initializationPromise;
    }

    private async _doInitialize(): Promise<void> {
        if (!config.geminiApiKey) {
            throw new ServiceUnavailableError('AI service not configured');
        }

        this.genAI = new GoogleGenerativeAI(config.geminiApiKey);

        // Try models in order until one works
        for (const modelName of this.MODEL_OPTIONS) {
            try {
                logger.debug({ model: modelName }, 'Attempting to initialize AI model');
                
                const model = this.genAI.getGenerativeModel({
                    model: modelName,
                    safetySettings: [
                        {
                            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                        },
                        {
                            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                        },
                    ],
                });

                // Test the model with a simple request
                await model.generateContent('test');
                
                this.model = model;
                this.modelName = modelName;
                this.initialized = true;
                
                logger.info({ model: modelName }, 'AI model initialized successfully');
                return;
            } catch (error: any) {
                logger.warn({ model: modelName, error: error.message }, 'Model initialization failed, trying next');
            }
        }

        throw new ServiceUnavailableError('Failed to initialize any AI model');
    }

    /**
     * Get the initialized model
     */
    private async getModel(): Promise<GenerativeModel> {
        await this.initialize();
        if (!this.model) {
            throw new ServiceUnavailableError('AI model not available');
        }
        return this.model;
    }

    /**
     * Analyze ECO risk using AI
     */
    async analyzeECORisk(input: ECORiskInput): Promise<RiskAnalysisResult> {
        const model = await this.getModel();

        const productInfo = input.product 
            ? `${input.product.name} (${input.product.sku}) - Category: ${input.product.category}`
            : 'Not specified';

        const prompt = `You are an expert manufacturing and engineering change analyst. Analyze the following Engineering Change Order (ECO) and provide a detailed risk assessment.

ECO Details:
- Title: ${input.title}
- Description: ${input.description}
- Change Type: ${input.type}
- Priority: ${input.priority}
- Product: ${productInfo}
- Proposed Changes: ${JSON.stringify(input.proposedChanges, null, 2)}

Please analyze this ECO and respond with a JSON object containing:
{
    "riskScore": <number 1-10, where 10 is highest risk>,
    "predictedDelay": <estimated days of potential delay>,
    "keyRisks": [<list of 3-5 key risk factors>],
    "recommendations": [<list of 3-5 actionable recommendations>],
    "impactAreas": [<list of affected areas: "Production", "Quality", "Cost", "Supply Chain", "Compliance", etc>],
    "overallAssessment": "<2-3 sentence summary of the risk level and main concerns>"
}

Consider factors like:
- Manufacturing complexity
- Supply chain impact
- Quality implications
- Timeline feasibility
- Resource requirements
- Regulatory compliance (if applicable)
- Historical patterns for similar changes

Respond ONLY with the JSON object, no additional text.`;

        try {
            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            // Parse the JSON response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Invalid AI response format');
            }

            const analysis = JSON.parse(jsonMatch[0]) as RiskAnalysisResult;

            // Validate and sanitize the response
            return {
                riskScore: Math.max(1, Math.min(10, analysis.riskScore || 5)),
                predictedDelay: Math.max(0, analysis.predictedDelay || 0),
                keyRisks: Array.isArray(analysis.keyRisks) ? analysis.keyRisks.slice(0, 5) : [],
                recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations.slice(0, 5) : [],
                impactAreas: Array.isArray(analysis.impactAreas) ? analysis.impactAreas : [],
                overallAssessment: analysis.overallAssessment || 'Analysis completed.',
            };
        } catch (error: any) {
            logger.error({ error: error.message, ecoTitle: input.title }, 'AI risk analysis failed');
            
            // Return a default response on failure
            return {
                riskScore: 5,
                predictedDelay: 0,
                keyRisks: ['AI analysis unavailable - manual review recommended'],
                recommendations: ['Please perform manual risk assessment'],
                impactAreas: [],
                overallAssessment: 'Automated analysis failed. Please conduct manual review.',
            };
        }
    }

    /**
     * Chat with AI assistant
     */
    async chat(messages: ChatMessage[], context?: Record<string, any>): Promise<string> {
        const model = await this.getModel();

        const systemPrompt = `You are FluxERP AI Assistant, an expert in manufacturing ERP systems, engineering change management, bill of materials, production planning, and supply chain operations.

Your capabilities include:
- Analyzing ECOs (Engineering Change Orders) and their impact
- Providing guidance on BOM (Bill of Materials) management
- Helping with work order planning and optimization
- Offering insights on supplier quality management
- Answering questions about manufacturing best practices

${context ? `Current Context:\n${JSON.stringify(context, null, 2)}` : ''}

Please provide helpful, accurate, and concise responses. If you're unsure about something specific to the user's data, acknowledge that and provide general guidance.`;

        // Build conversation history
        const conversationHistory = messages.map(m => 
            `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
        ).join('\n\n');

        const fullPrompt = `${systemPrompt}\n\nConversation:\n${conversationHistory}\n\nAssistant:`;

        try {
            const result = await model.generateContent(fullPrompt);
            const response = result.response;
            return response.text();
        } catch (error: any) {
            logger.error({ error: error.message }, 'AI chat failed');
            throw new ServiceUnavailableError('AI service temporarily unavailable');
        }
    }

    /**
     * Generate BOM optimization suggestions
     */
    async suggestBOMOptimizations(bomData: {
        productName: string;
        components: Array<{ name: string; quantity: number; unit: string; cost?: number }>;
    }): Promise<{
        suggestions: string[];
        potentialSavings: string;
        alternativeComponents: string[];
    }> {
        const model = await this.getModel();

        const prompt = `Analyze the following Bill of Materials and suggest optimizations:

Product: ${bomData.productName}
Components:
${bomData.components.map((c, i) => `${i + 1}. ${c.name}: ${c.quantity} ${c.unit}${c.cost ? ` ($${c.cost})` : ''}`).join('\n')}

Provide:
1. Cost reduction suggestions
2. Alternative components that could reduce cost or improve quality
3. Potential consolidation opportunities

Respond with JSON:
{
    "suggestions": [<list of optimization suggestions>],
    "potentialSavings": "<estimate of potential cost savings>",
    "alternativeComponents": [<list of alternative component suggestions>]
}

Response ONLY with the JSON object.`;

        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Invalid response format');
            }
            return JSON.parse(jsonMatch[0]);
        } catch (error: any) {
            logger.error({ error: error.message }, 'BOM optimization analysis failed');
            return {
                suggestions: ['AI analysis unavailable'],
                potentialSavings: 'Unable to estimate',
                alternativeComponents: [],
            };
        }
    }

    /**
     * Get model info
     */
    getModelInfo() {
        return {
            initialized: this.initialized,
            model: this.modelName,
            available: !!config.geminiApiKey,
        };
    }
}

// Export singleton instance
export const aiService = new AIService();
