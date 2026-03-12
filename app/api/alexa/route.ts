import { NextRequest, NextResponse } from 'next/server';
import * as Alexa from 'ask-sdk-core';
import { GoogleGenAI } from '@google/genai';
import { createAgent } from '@/lib/openrouter-agent/agent';
import { defaultTools } from '@/lib/openrouter-agent/tools';

// Inicializar SDK de Gemini
const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

/**
 * AI Router: Orquesta la llamada a Gemini con Fallback a OpenRouter.
 * Implementa 'Adaptive Thinking' limitando tokens para responder en < 8 segundos.
 */
async function getAIResponse(prompt: string): Promise<{text: string, provider: string}> {
    const systemInstruction = "Eres 'Modo Pro', un asistente de voz avanzado. Responde de forma concisa, conversacional y directa. Máximo 3 oraciones. No uses formato markdown, asteriscos ni emojis, solo texto leíble por voz.";
    
    try {
        // 1. Intento Principal: Gemini 2.5 Flash
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
                maxOutputTokens: 150 // Limita la latencia
            }
        });
        return { text: response.text || '', provider: 'Gemini 2.5 Flash' };
        
    } catch (error: any) {
        console.warn("Gemini falló o hizo timeout. Activando fallback a OpenRouter...", error.message);
        
        try {
            // 2. Fallback: OpenRouter (Llama 3.1 8B Instruct Free) via Modular Agent
            const agent = createAgent({
                apiKey: process.env.OPENROUTER_API_KEY || '',
                model: 'meta-llama/llama-3.1-8b-instruct:free',
                instructions: systemInstruction,
                tools: defaultTools,
                maxSteps: 2
            });
            
            const fallbackResponse = await agent.sendSync(prompt);
            return { text: fallbackResponse, provider: 'OpenRouter (Llama 3.1 8B)' };
        } catch (openRouterError: any) {
            console.error("OpenRouter también falló:", openRouterError.message);
            throw openRouterError; // Propagar para manejo específico en el Intent
        }
    }
}

// Handlers de Alexa
const LaunchRequestHandler = {
    canHandle(handlerInput: Alexa.HandlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput: Alexa.HandlerInput) {
        const speakOutput = 'Modo Pro activado. ¿Qué necesitas saber?';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('Puedes hacerme cualquier pregunta compleja.')
            .getResponse();
    }
};

const PreguntaProIntentHandler = {
    canHandle(handlerInput: Alexa.HandlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PreguntaProIntent';
    },
    async handle(handlerInput: Alexa.HandlerInput) {
        const pregunta = Alexa.getSlotValue(handlerInput.requestEnvelope, 'pregunta');
        let speakOutput = '';
        let provider = 'Ninguno';
        
        try {
            if (pregunta) {
                const aiResult = await getAIResponse(pregunta);
                speakOutput = aiResult.text || 'No pude generar una respuesta.';
                provider = aiResult.provider;
            } else {
                speakOutput = 'No escuché tu pregunta. ¿Puedes repetirla?';
            }
        } catch (error: any) {
            console.error("Error crítico en orquestación de IA:", error);
            
            const errorMessage = (error?.message || '').toLowerCase();
            const status = error?.status || error?.response?.status;

            // Mensajes de error específicos y controlados (Anti-Slop / No inventar datos)
            if (errorMessage.includes('401') || errorMessage.includes('403') || status === 401 || status === 403 || errorMessage.includes('api key')) {
                speakOutput = 'Lo siento, hay un problema con mis credenciales de acceso. Por favor, verifica la configuración del sistema.';
            } else if (errorMessage.includes('429') || status === 429 || errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
                speakOutput = 'He recibido demasiadas peticiones en poco tiempo. Por favor, espera un momento antes de volver a preguntar.';
            } else if (errorMessage.includes('timeout') || errorMessage.includes('network') || errorMessage.includes('fetch')) {
                speakOutput = 'La conexión con mis servidores está tardando demasiado. Por favor, intenta de nuevo más tarde.';
            } else {
                speakOutput = 'Lo siento, ocurrió un error inesperado al procesar tu solicitud. Mis servidores podrían estar experimentando problemas.';
            }
        }

        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes() || {};
        sessionAttributes.aiProvider = provider;
        attributesManager.setSessionAttributes(sessionAttributes);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput: Alexa.HandlerInput, error: Error) {
        console.error(`Error manejado por Alexa SDK: ${error.message}`);
        return handlerInput.responseBuilder
            .speak('Hubo un problema procesando tu voz. ¿Puedes repetirlo?')
            .reprompt('¿Puedes repetirlo?')
            .getResponse();
    }
};

// Construcción del Skill
const skillBuilder = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        PreguntaProIntentHandler
    )
    .addErrorHandlers(ErrorHandler);

const skill = skillBuilder.create();

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const response = await skill.invoke(body);
        return NextResponse.json(response);
    } catch (error) {
        console.error("Error en la invocación del skill:", error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
