/**
 * AI Chat Command: /ai (/ask /agent /gpt)
 * 
 * Written in native Goatbot-V2 FCA command format (module.exports.config, onStart / run).
 * Demonstrates seamless integration between Goatbot FCA API Adapter (system/api-adapter.js)
 * and the AstrBot-inspired Agentic AI Core Engine (system/ai-core.js).
 * 
 * Signature: onStart({ api, event, args, message, getLang })
 */

const aiCore = require("../../system/ai-core.js");

module.exports = {
        config: {
                name: "ai",
                aliases: ["ask", "agent", "gpt", "astrabot"],
                version: "2.1",
                author: "frnAlt & Gtajisan",
                countDown: 3,
                role: 0,
                description: {
                        vi: "Trò chuyện với AI Agent nâng cao (Hỗ trợ Tool Use, RAG, Multi-LLM)",
                        en: "Chat with Agentic AI Core (Tool Use, RAG, Multi-LLM routing)"
                },
                category: "ai-agent",
                guide: {
                        vi: "{pn} <cau hoi>",
                        en: "{pn} <question>"
                }
        },

        langs: {
                vi: {
                        thinking: "🤖 [AI Core] Đang suy nghĩ...",
                        missingPrompt: "⚠ Vui lòng nhập câu hỏi cho AI!"
                },
                en: {
                        thinking: "🤖 [AI Core] Thinking & Analyzing...",
                        missingPrompt: "⚠ Please enter a question for the AI Agent!"
                }
        },

        // Native Goatbot V2 command entrypoint
        onStart: async function ({ api, event, args, message, getLang }) {
                const prompt = args.join(" ");

                if (!prompt) {
                        return message.reply(getLang("missingPrompt"));
                }

                await message.reply(getLang("thinking"));

                try {
                        const contextId = `${event.threadID}_${event.senderID}`;
                        const aiResponse = await aiCore.generateCompletion({
                                prompt,
                                contextId
                        });

                        // Send response using Goatbot FCA api.sendMessage
                        api.sendMessage(
                                `🤖 <b>[AI Agent - ${aiCore.getProvider().toUpperCase()}]</b>\n\n${aiResponse}`,
                                event.threadID,
                                (err, info) => {
                                        if (!err) {
                                                api.setMessageReaction("🧠", event.messageID, event.threadID);
                                        }
                                },
                                event.messageID
                        );
                } catch (err) {
                        message.reply(`❌ AI Engine Error: ${err.message}`);
                }
        },

        // Aliased run method for full backwards compatibility
        run: async function (params) {
                return module.exports.onStart(params);
        }
};
