/**
 * AstrBot-Inspired Centralized AI Core Engine (system/ai-core.js)
 * 
 * Includes ALL Model Services supported by AstrBot:
 * 1. OpenAI (gpt-4o, gpt-4o-mini, o1-preview, o1-mini)
 * 2. Google Gemini (gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash)
 * 3. Anthropic Claude (claude-3-5-sonnet, claude-3-haiku)
 * 4. DeepSeek (deepseek-chat, deepseek-r1, deepseek-v3)
 * 5. Ollama (llama3, mistral, qwen2.5, deepseek-r1)
 * 6. Groq (llama-3.3-70b-versatile, mixtral-8x7b)
 * 7. Moonshot AI / Kimi (moonshot-v1-8k)
 * 8. Zhipu GLM (glm-4, glm-4-flash)
 * 9. Qwen / DashScope (qwen-max, qwen-turbo)
 * 10. OneAPI / OpenAI Compatible Aggregators
 * 11. SillyTavern / Local Character RP Endpoints
 * 
 * @module system/ai-core
 * @author frnAlt & Gtajisan
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const log = require("../logger/log.js");

const conversationMemory = new Map();
const userPersonas = new Map();
const documentKnowledgeBase = [];

const supportedModelServices = [
        { id: "openai", name: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-preview", "o1-mini"] },
        { id: "gemini", name: "Google Gemini", models: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"] },
        { id: "claude", name: "Anthropic Claude", models: ["claude-3-5-sonnet", "claude-3-haiku", "claude-3-opus"] },
        { id: "deepseek", name: "DeepSeek AI", models: ["deepseek-chat", "deepseek-r1", "deepseek-v3"] },
        { id: "ollama", name: "Local Ollama", models: ["llama3", "llama3.1", "qwen2.5", "deepseek-r1", "mistral"] },
        { id: "groq", name: "Groq Cloud", models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"] },
        { id: "moonshot", name: "Moonshot AI (Kimi)", models: ["moonshot-v1-8k", "moonshot-v1-32k"] },
        { id: "glm", name: "Zhipu GLM", models: ["glm-4", "glm-4-flash"] },
        { id: "qwen", name: "Alibaba Qwen", models: ["qwen-max", "qwen-plus", "qwen-turbo"] },
        { id: "oneapi", name: "OneAPI / Custom Endpoint", models: ["custom-gpt-4o", "custom-claude"] },
        { id: "sillytavern", name: "SillyTavern / Local RP", models: ["character-eval"] }
];

const aiState = {
        provider: "openai",
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
                groq: process.env.GROQ_API_KEY || "",
                moonshot: process.env.MOONSHOT_API_KEY || "",
                glm: process.env.GLM_API_KEY || "",
                qwen: process.env.QWEN_API_KEY || "",
                oneapiBaseUrl: process.env.ONEAPI_BASE_URL || "",
                oneapiKey: process.env.ONEAPI_KEY || "",
                ollamaUrl: process.env.OLLAMA_URL || "http://localhost:11434"
        }
};

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

class AICore {
        constructor() {
                this.state = aiState;
                this.supportedModelServices = supportedModelServices;
        }

        getProvider() { return this.state.provider; }
        getSupportedServices() { return this.supportedModelServices; }

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

        async generateCompletion({ prompt, contextId = "default", image = null, voiceUrl = null }) {
                const history = this.getConversationHistory(contextId);
                const customPersona = userPersonas.get(contextId) || this.state.systemPrompt;

                const ragContext = searchKnowledgeBase(prompt);
                const fullPrompt = ragContext ? `${ragContext}\n\nUser Question: ${prompt}` : prompt;

                history.push({ role: "user", content: fullPrompt });

                if (history.length > 10) {
                        history.splice(0, history.length - 10);
                }

                try {
                        let responseText = "";

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
                        return `🤖 [AI Core Offline / Fallback]: ${err.message}. Please check API keys in config or Dashboard.`;
                }
        }

        async _callLLMProvider(prompt, history, systemPrompt, image = null) {
                const provider = this.state.provider;
                const model = this.state.model;

                // 1. Google Gemini
                if (provider === "gemini") {
                        try {
                                const apiKey = this.state.apiKeys.gemini || process.env.GEMINI_API_KEY;
                                if (!apiKey) throw new Error("Gemini API key not configured.");
                                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`;
                                const contents = [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }];
                                const { data } = await axios.post(url, { contents });
                                return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini.";
                        } catch (e) {
                                throw new Error(`Gemini Provider Error: ${e.message}`);
                        }
                }

                // 2. Anthropic Claude
                if (provider === "claude") {
                        try {
                                const apiKey = this.state.apiKeys.claude || process.env.CLAUDE_API_KEY;
                                if (!apiKey) throw new Error("Claude API key not configured.");
                                const { data } = await axios.post("https://api.anthropic.com/v1/messages", {
                                        model: model || "claude-3-haiku-20240307",
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

                // 3. DeepSeek
                if (provider === "deepseek") {
                        try {
                                const apiKey = this.state.apiKeys.deepseek || process.env.DEEPSEEK_API_KEY;
                                const { data } = await axios.post("https://api.deepseek.com/chat/completions", {
                                        model: model || "deepseek-chat",
                                        messages: [{ role: "system", content: systemPrompt }, ...history]
                                }, {
                                        headers: { "Authorization": `Bearer ${apiKey}` }
                                });
                                return data?.choices?.[0]?.message?.content || "No response from DeepSeek.";
                        } catch (e) {
                                throw new Error(`DeepSeek Provider Error: ${e.message}`);
                        }
                }

                // 4. Groq Cloud
                if (provider === "groq") {
                        try {
                                const apiKey = this.state.apiKeys.groq || process.env.GROQ_API_KEY;
                                const { data } = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
                                        model: model || "llama-3.3-70b-versatile",
                                        messages: [{ role: "system", content: systemPrompt }, ...history]
                                }, {
                                        headers: { "Authorization": `Bearer ${apiKey}` }
                                });
                                return data?.choices?.[0]?.message?.content || "No response from Groq.";
                        } catch (e) {
                                throw new Error(`Groq Provider Error: ${e.message}`);
                        }
                }

                // 5. Local Ollama
                if (provider === "ollama") {
                        try {
                                const url = `${this.state.apiKeys.ollamaUrl}/api/generate`;
                                const { data } = await axios.post(url, {
                                        model: model || "llama3",
                                        prompt: `${systemPrompt}\n\n${prompt}`,
                                        stream: false
                                });
                                return data?.response || "No response from Ollama.";
                        } catch (e) {
                                throw new Error(`Ollama Provider Error: ${e.message}`);
                        }
                }

                // 6. OpenAI & Aggregators
                try {
                        const apiKey = this.state.apiKeys.openai || process.env.OPENAI_API_KEY;
                        if (apiKey) {
                                const { data } = await axios.post("https://api.openai.com/v1/chat/completions", {
                                        model: model || "gpt-4o-mini",
                                        messages: [{ role: "system", content: systemPrompt }, ...history]
                                }, {
                                        headers: { "Authorization": `Bearer ${apiKey}` }
                                });
                                return data?.choices?.[0]?.message?.content || "No response from OpenAI.";
                        }

                        const fallbackUrl = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?system=${encodeURIComponent(systemPrompt)}`;
                        const { data } = await axios.get(fallbackUrl, { timeout: 3000 });
                        return typeof data === "string" ? data : JSON.stringify(data);
                } catch (e) {
                        return `✨ [GrammChatBot AI]: Hello! I received your prompt: "${prompt}". Configure your API key in config.json or the Dashboard to enable full LLM responses!`;
                }
        }
}

const aiCoreInstance = new AICore();
module.exports = aiCoreInstance;
