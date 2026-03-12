'use client';

import { useState, useEffect } from 'react';
import { Play, MessageSquare, Terminal, AlertCircle, Loader2, Cpu, CheckCircle2 } from 'lucide-react';

const LOADING_STEPS = [
  "Conectando con el servidor de Alexa...",
  "Procesando intención (NLP)...",
  "Enrutando a la Inteligencia Artificial...",
  "Generando respuesta (Gemini / OpenRouter)...",
  "Formateando respuesta de voz..."
];

export default function TestAlexaModule() {
  const [inputText, setInputText] = useState('');
  const [responseSpeech, setResponseSpeech] = useState<string | null>(null);
  const [responseJson, setResponseJson] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
      }, 800);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const sendAlexaRequest = async (requestBody: any) => {
    setIsLoading(true);
    setError(null);
    setResponseSpeech(null);
    setResponseJson(null);
    setAiProvider(null);

    try {
      const res = await fetch('/api/alexa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setResponseJson(data);

      if (data.sessionAttributes?.aiProvider) {
        setAiProvider(data.sessionAttributes.aiProvider);
      }

      // Extraer el texto hablado de la respuesta de Alexa
      if (data.response?.outputSpeech?.ssml) {
        // Limpiar las etiquetas SSML (<speak>...</speak>) para mostrar el texto limpio
        const cleanText = data.response.outputSpeech.ssml.replace(/<[^>]*>?/gm, '');
        setResponseSpeech(cleanText);
      } else if (data.response?.outputSpeech?.text) {
        setResponseSpeech(data.response.outputSpeech.text);
      } else {
        setResponseSpeech("No se detectó salida de voz en la respuesta.");
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunchRequest = () => {
    const launchPayload = {
      version: '1.0',
      session: { new: true, sessionId: 'amzn1.echo-api.session.test', application: { applicationId: 'test' }, user: { userId: 'test-user' } },
      request: {
        type: 'LaunchRequest',
        requestId: `amzn1.echo-api.request.${Date.now()}`,
        timestamp: new Date().toISOString(),
        locale: 'es-ES',
      },
    };
    sendAlexaRequest(launchPayload);
  };

  const handleIntentRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const intentPayload = {
      version: '1.0',
      session: { new: false, sessionId: 'amzn1.echo-api.session.test', application: { applicationId: 'test' }, user: { userId: 'test-user' } },
      request: {
        type: 'IntentRequest',
        requestId: `amzn1.echo-api.request.${Date.now()}`,
        timestamp: new Date().toISOString(),
        locale: 'es-ES',
        intent: {
          name: 'PreguntaProIntent',
          confirmationStatus: 'NONE',
          slots: {
            pregunta: {
              name: 'pregunta',
              value: inputText,
              confirmationStatus: 'NONE',
            },
          },
        },
      },
    };
    sendAlexaRequest(intentPayload);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <header className="space-y-2 border-b border-zinc-800 pb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
            <Terminal className="w-8 h-8 text-emerald-500" />
            Módulo de Pruebas: Alexa Modo Pro
          </h1>
          <p className="text-zinc-400">
            Simula peticiones JSON de Alexa para probar el enrutamiento de IA (Gemini/OpenRouter) y el manejo de errores.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Panel de Control */}
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Play className="w-5 h-5 text-indigo-400" />
                1. Probar LaunchRequest
              </h2>
              <p className="text-sm text-zinc-400 mb-4">
                Simula cuando el usuario dice: <span className="italic text-zinc-300">"Alexa, abre Modo Pro"</span>
              </p>
              <button
                onClick={handleLaunchRequest}
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar LaunchRequest'}
              </button>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                2. Probar PreguntaProIntent
              </h2>
              <p className="text-sm text-zinc-400 mb-4">
                Simula cuando el usuario hace una pregunta al skill.
              </p>
              <form onSubmit={handleIntentRequest} className="space-y-4">
                <div>
                  <label htmlFor="question" className="block text-sm font-medium text-zinc-400 mb-1">
                    Pregunta (Slot 'pregunta'):
                  </label>
                  <input
                    id="question"
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Ej: ¿Por qué el cielo es azul?"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !inputText.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar Pregunta'}
                </button>
              </form>
            </div>
          </div>

          {/* Panel de Resultados */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col h-full">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-zinc-400" />
              Respuesta de Alexa
            </h2>
            
            <div className="flex-1 flex flex-col gap-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-red-400">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {isLoading && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  <div className="text-sm text-zinc-400 font-medium animate-pulse">
                    {LOADING_STEPS[loadingStep]}
                  </div>
                </div>
              )}

              {responseSpeech && !isLoading && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-4">
                  {aiProvider && aiProvider !== 'Ninguno' && (
                    <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-lg w-fit">
                      <Cpu className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        Respondido por: {aiProvider}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">
                      Alexa dirá:
                    </span>
                    <p className="text-lg text-emerald-400 font-medium leading-relaxed">
                      "{responseSpeech}"
                    </p>
                  </div>
                </div>
              )}

              {responseJson && !isLoading && (
                <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-hidden flex flex-col">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">
                    JSON Crudo (Response):
                  </span>
                  <div className="flex-1 overflow-auto">
                    <pre className="text-xs text-zinc-400 font-mono whitespace-pre-wrap break-all">
                      {JSON.stringify(responseJson, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {!responseSpeech && !responseJson && !error && !isLoading && (
                <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm italic border-2 border-dashed border-zinc-800 rounded-xl p-8 text-center">
                  Envía una petición para ver la respuesta aquí.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
