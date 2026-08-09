/**
 * Example Command written in exact Goatbot-V2 FCA Syntax:
 * Proves that classic Goatbot commands function natively on Telegram via system/api-adapter.js!
 * 
 * Signature: onStart({ api, event, args, message, getLang })
 * Classic FCA Calls: api.sendMessage(), event.threadID, event.senderID, api.unsendMessage()
 */

const axios = require("axios");

module.exports = {
        config: {
                name: "examplecmd",
                aliases: ["fca2tca", "testadapter"],
                version: "2.0",
                author: "frnAlt & Gtajisan",
                countDown: 5,
                role: 0,
                description: {
                        vi: "Lệnh mẫu dùng cú pháp Goatbot FB gốc (FCA API)",
                        en: "Example command using native Goatbot FB syntax (FCA API)"
                },
                category: "utility",
                guide: {
                        vi: "{pn} [text]",
                        en: "{pn} [text]"
                }
        },

        langs: {
                vi: {
                        reply: "✅ [FCA Adapter Test]\nSender ID: %1\nThread ID: %2\nNội dung: %3"
                },
                en: {
                        reply: "✅ [FCA Adapter Test]\nSender ID: %1\nThread ID: %2\nText Body: %3"
                }
        },

        // Classic Goatbot V2 onStart signature
        onStart: async function ({ api, event, args, message, getLang }) {
                const text = args.join(" ") || "No text provided";

                // Native FCA call: api.sendMessage(text, threadID, callback, messageID)
                api.sendMessage(
                        getLang("reply", event.senderID, event.threadID, text),
                        event.threadID,
                        async (err, info) => {
                                if (err) return;
                                // React using FCA api.setMessageReaction
                                api.setMessageReaction("👍", event.messageID, event.threadID);
                        },
                        event.messageID
                );
        }
};
