import React from 'react';

export default function Page() {
  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Alexa Skill: Modo Pro</h1>
        <p className="text-slate-500 mb-8">Tu endpoint de Alexa está activo y listo para recibir peticiones.</p>
        
        <div className="bg-slate-100 p-4 rounded-xl mb-8">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">Endpoint URL (HTTPS)</h2>
          <code className="text-sm text-indigo-600 break-all">
            {process.env.APP_URL ? `${process.env.APP_URL}/api/alexa` : 'https://tu-app-url.run.app/api/alexa'}
          </code>
        </div>

        <h2 className="text-xl font-semibold mb-4">Instrucciones de Configuración</h2>
        <ol className="list-decimal list-inside space-y-4 text-slate-700">
          <li>Ve a la <a href="https://developer.amazon.com/alexa/console/ask" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Alexa Developer Console</a> y crea una nueva Skill (Custom, Provision your own).</li>
          <li>En <strong>Interaction Model &gt; JSON Editor</strong>, pega el modelo de interacción (ver abajo).</li>
          <li>Ve a <strong>Endpoint</strong>, selecciona <strong>HTTPS</strong> y pega la URL de arriba en <em>Default Region</em>.</li>
          <li>En el certificado, selecciona: <em>"My development endpoint is a sub-domain of a domain that has a wildcard certificate from a certificate authority"</em>.</li>
          <li>Guarda y compila el modelo.</li>
        </ol>

        <h2 className="text-xl font-semibold mt-8 mb-4">Modelo de Interacción (JSON)</h2>
        <pre className="bg-slate-900 text-slate-50 p-4 rounded-xl overflow-x-auto text-sm">
{`{
  "interactionModel": {
    "languageModel": {
      "invocationName": "modo pro",
      "intents": [
        {
          "name": "PreguntaProIntent",
          "slots": [
            {
              "name": "pregunta",
              "type": "AMAZON.SearchQuery"
            }
          ],
          "samples": [
            "que {pregunta}",
            "quien {pregunta}",
            "como {pregunta}",
            "por que {pregunta}",
            "dime {pregunta}",
            "explica {pregunta}",
            "sobre {pregunta}",
            "{pregunta}"
          ]
        },
        {
          "name": "AMAZON.CancelIntent",
          "samples": []
        },
        {
          "name": "AMAZON.HelpIntent",
          "samples": []
        },
        {
          "name": "AMAZON.StopIntent",
          "samples": []
        }
      ],
      "types": []
    }
  }
}`}
        </pre>
      </div>
    </div>
  );
}
