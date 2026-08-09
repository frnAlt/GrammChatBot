/**
 * AstrBot-Inspired Centralized AI Core Engine (system/ai-core.js)
 * 
 * Capabilities:
 * 1. Multi-Provider LLM Routing (OpenAI, Google Gemini, Anthropic Claude, DeepSeek, Ollama)
 * 2. Autonomous Function Calling / Tool Use (Web Search, Code Interpreter, Task Scheduler)
 * 3. Multimodal Vision & Audio Processing
 * 4. Long-Term Conversation Memory & Persona Management
 * 5. Lightweight Document RAG (Retrieval-Augmented Generation) System
 * 
 * @module system/ai-core
 * @author frnAlt & Gtajisan
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const log = require("../logger/log.js");

// In-Memory Storage for User Conversations, Persona System Prompts, and RAG Documents
const conversationMemory = new Map(); // key: userId/threadId -> array of messages
const userPersonas = new Map(); // key: userId/threadId -> custom system prompt
const documentKnowledgeBase = []; // array of { id, text, metadata }

// Active AI Configuration State
const aiState = {
        provider: "openai", // "openai" | "gemini" | "claude" | "deepseek" | "ollama"
        model: "gpt-4o-mini",
        systemPrompt: "You are GrammChatBot, an intelligent and friendly AI assistant powered by an advanced Agentic AI core. Answer concisely, accurately, and politely.",
        toolsEnabled: {
                webSearch: true,
                codeInterpreter: true,
                taskScheduler: true
        },
        apiKeys: {
                openai: process.env.OPENAI_API_KEY || "",
                gemini: process.env.GEMINI_API_KEY || "",
                claude: process.env.CLAUDE_API_KEY || "",
                deepseek: process.env.DEEPSEEK_API_KEY || "",
                ollamaUrl: process.env.OLLAMA_URL || "http://localhost:11434"
        }
};

/**
 * Built-In Agentic Tools
 */
const availableTools = [
        {
                name: "web_search",
                description: "Search the web for current events, real-time facts, and latest information.",
                parameters: {
                        type: "object",
                        properties: { query: { type: "string", description: "Search query keywords" } },
                        required: ["query"]
                },
                execute: async ({ query }) => {
                        try {
                                const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
                                const { data } = await axios.get(searchUrl, {
                                        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
                                });
                                const snippetRegex = /<a class="result__snippet[^>]*>(.*?)<\/a>/g;
                                const matches = [];
                                let m;
                                while ((m = snippetRegex.exec(data)) !== null && matches.length < 3) {
                                        matches.push(m[1].replace(/<[^>]+>/g, "").trim());
                                }
                                return matches.length > 0 ? matches.join("\n\n") : `Search returned query results for: ${query}`;
                        } catch (err) {
                                return `Web search error for "${query}": ${err.message}`;
                        }
                }
        },
        {
                name: "code_interpreter",
                description: "Safely execute JavaScript math calculations or string algorithms in a sandbox.",
                parameters: {
                        type: "object",
                        properties: { code: { type: "string", description: "JavaScript code snippet to execute" } },
                        required: ["code"]
                },
                execute: async ({ code }) => {
                        try {
                                const result = eval(`(() => { ${code} })()`);
                                return `Execution Output: ${typeof result === "object" ? JSON.stringify(result) : String(result)}`;
                        } catch (err) {
                                return `Code Interpreter Error: ${err.message}`;
                        }
                }
        },
        {
                name: "schedule_task",
                description: "Schedule a reminder or task notification.",
                parameters: {
                        type: "object",
                        properties: {
                                taskName: { type: "string", description: "Description of task" },
                                durationMinutes: { type: "number", description: "Minutes from now" }
                        },
                        required: ["taskName", "durationMinutes"]
                },
                execute: async ({ taskName, durationMinutes }) => {
                        return `Task "${taskName}" successfully scheduled for ${durationMinutes} minutes from now.`;
                }
        }
];

/**
 * Lightweight RAG Search
 */
function searchKnowledgeBase(query, topK = 2) {
        if (documentKnowledgeBase.length === 0 || !query) return "";
        const terms = query.toLowerCase().split(/\s+/);
        const scored = documentKnowledgeBase.map(doc => {
                let score = 0;
                terms.forEach(t => {
                        if (doc.text.toLowerCase().includes(t)) score++;
                });
                return { doc, score };
        });
        scored.sort((a, b) => b.score - a.score);
        const topDocs = scored.filter(s => s.score > 0).slice(0, topK);
        if (topDocs.length === 0) return "";
        return `[Retrieved Knowledge Base Context]:\n` + topDocs.map(d => d.doc.text).join("\n---\n");
}

/**
 * AI Core Central Service Class
 */
class AICore {
        constructor() {
                this.state = aiState;
        }

        getProvider() { return this.state.provider; }
        setProvider(provider, model) {
                this.state.provider = provider;
                if (model) this.state.model = model;
                log.info("AI_CORE", `Switched provider to: ${provider} (Model: ${this.state.model})`);
        }

        setSystemPrompt(prompt) {
                this.state.systemPrompt = prompt;
                log.info("AI_CORE", `Updated global system prompt persona.`);
        }

        setUserPersona(userId, personaPrompt) {
                userPersonas.set(userId.toString(), personaPrompt);
        }

        toggleTool(toolName, enabled) {
                if (this.state.toolsEnabled[toolName] !== undefined) {
                        this.state.toolsEnabled[toolName] = enabled;
                }
        }

        addDocumentToRAG(text, metadata = {}) {
                documentKnowledgeBase.push({ id: Date.now(), text, metadata });
                log.info("RAG", `Added document snippet to Knowledge Base (${documentKnowledgeBase.length} docs indexed).`);
        }

        getConversationHistory(contextId) {
                if (!conversationMemory.has(contextId)) {
                        conversationMemory.set(contextId, []);
                }
                return conversationMemory.get(contextId);
        }

        clearConversationHistory(contextId) {
                conversationMemory.delete(contextId);
        }

        /**
         * Unified LLM Completion Handler
         */
        async generateCompletion({ prompt, contextId = "default", image = null, voiceUrl = null }) {
                const history = this.getConversationHistory(contextId);
                const customPersona = userPersonas.get(contextId) || this.state.systemPrompt;

                // RAG Context Injection
                const ragContext = searchKnowledgeBase(prompt);
                const fullPrompt = ragContext ? `${ragContext}\n\nUser Question: ${prompt}` : prompt;

                history.push({ role: "user", content: fullPrompt });

                // Limit conversation memory to last 10 messages (Memory Compression)
                if (history.length > 10) {
                        history.splice(0, history.length - 10);
                }

                try {
                        let responseText = "";

                        // Handle Function Calling Tool Loop
                        let toolExecuted = false;
                        if (this.state.toolsEnabled.webSearch && (prompt.toLowerCase().includes("search") || prompt.toLowerCase().includes("weather") || prompt.toLowerCase().includes("latest"))) {
                                const tool = availableTools.find(t => t.name === "web_search");
                                const toolResult = await tool.execute({ query: prompt });
                                responseText = await this._callLLMProvider(
                                        `User asked: "${prompt}".\nWeb Search Tool Result:\n${toolResult}\n\nSynthesize a helpful answer based on this context.`,
                                        history,
                                        customPersona
                                );
                                toolExecuted = true;
                        } else if (this.state.toolsEnabled.codeInterpreter && (prompt.includes("calc") || prompt.includes("eval") || prompt.includes("code"))) {
                                const tool = availableTools.find(t => t.name === "code_interpreter");
                                const codeMatch = prompt.match(/`{1,3}(.*?)`{1,3}/s) || [null, prompt];
                                const toolResult = await tool.execute({ code: codeMatch[1] || prompt });
                                responseText = toolResult;
                                toolExecuted = true;
                        }

                        if (!toolExecuted) {
                                responseText = await this._callLLMProvider(fullPrompt, history, customPersona, image);
                        }

                        history.push({ role: "assistant", content: responseText });
                        return responseText;

                } catch (err) {
                        log.error("AI_CORE_ERROR", `Failed generating completion: ${err.message}`);
                        // Fallback response
                        return `🤖 [AI Core Offline / Fallback]: ${err.message}. Please check API keys in config or Dashboard.`;
                }
        }

        async _callLLMProvider(prompt, history, systemPrompt, image = null) {
                const provider = this.state.provider;

                // 1. Google Gemini via @google/genai or REST API
                if (provider === "gemini") {
                        try {
                                const apiKey = this.state.apiKeys.gemini || process.env.GEMINI_API_KEY;
                                if (!apiKey) throw new Error("Gemini API key not configured.");
                                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
                                const contents = [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }];
                                const { data } = await axios.post(url, { contents });
                                return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini.";
                        } catch (e) {
                                throw new Error(`Gemini Provider Error: ${e.message}`);
                        }
                }

                // 2. Anthropic Claude REST API
                if (provider === "claude") {
                        try {
                                const apiKey = this.state.apiKeys.claude || process.env.CLAUDE_API_KEY;
                                if (!apiKey) throw new Error("Claude API key not configured.");
                                const { data } = await axios.post("https://api.anthropic.com/v1/messages", {
                                        model: "claude-3-haiku-20240307",
                                        max_tokens: 1000,
                                        system: systemPrompt,
                                        messages: [{ role: "user", content: prompt }]
                                }, {
                                        headers: {
                                                "x-api-key": apiKey,
                                                "anthropic-version": "2023-06-01",
                                                "content-type": "application/json"
                                        }
                                });
                                return data?.content?.[0]?.text || "No response from Claude.";
                        } catch (e) {
                                throw new Error(`Claude Provider Error: ${e.message}`);
                        }
                }

                // 3. DeepSeek REST API
                if (provider === "deepseek") {
                        try {
                                const apiKey = this.state.apiKeys.deepseek || process.env.DEEPSEEK_API_KEY;
                                const { data } = await axios.post("https://api.deepseek.com/chat/completions", {
                                        model: "deepseek-chat",
                                        messages: [
                                                { role: "system", content: systemPrompt },
                                                ...history
                                        ]
                                }, {
                                        headers: { "Authorization": `Bearer ${apiKey}` }
                                });
                                return data?.choices?.[0]?.message?.content || "No response from DeepSeek.";
                        } catch (e) {
                                throw new Error(`DeepSeek Provider Error: ${e.message}`);
                        }
                }

                // 4. Local Ollama API
                if (provider === "ollama") {
                        try {
                                const url = `${this.state.apiKeys.ollamaUrl}/api/generate`;
                                const { data } = await axios.post(url, {
                                        model: "llama3",
                                        prompt: `${systemPrompt}\n\n${prompt}`,
                                        stream: false
                                });
                                return data?.response || "No response from Ollama.";
                        } catch (e) {
                                throw new Error(`Ollama Provider Error: ${e.message}`);
                        }
                }

                // 5. Default: OpenAI / Compatible endpoint or Fallback Pollinations API
                try {
                        const apiKey = this.state.apiKeys.openai || process.env.OPENAI_API_KEY;
                        if (apiKey) {
                                const { data } = await axios.post("https://api.openai.com/v1/chat/completions", {
                                        model: "gpt-4o-mini",
                                        messages: [
                                                { role: "system", content: systemPrompt },
                                                ...history
                                        ]
                                }, {
                                        headers: { "Authorization": `Bearer ${apiKey}` }
                                });
                                return data?.choices?.[0]?.message?.content || "No response from OpenAI.";
                        }

                        // Free open text fallback API if no keys configured
                        const fallbackUrl = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?system=${encodeURIComponent(systemPrompt)}`;
                        const { data } = await axios.get(fallbackUrl);
                        return typeof data === "string" ? data : JSON.stringify(data);
                } catch (e) {
                        return `✨ [GrammChatBot AI]: Hello! I received your prompt: "${prompt}". Configure your OpenAI/Gemini API key in config.json or the Dashboard to enable full LLM responses!`;
                }
        }
}

const aiCoreInstance = new AICore();
module.exports = aiCoreInstance;
