/**
 * GoatBot V2 Telegram Command Template
 * 
 * Comparison of FB Messenger (FCA) vs Telegram (grammY):
 * 
 * 1. Context Object:
 *    - FB: Passed `api` & `event` (senderID, threadID, body, messageID).
 *    - Telegram: Passed `ctx` (grammY Context) containing `ctx.from`, `ctx.chat`, `ctx.message`, and `ctx.api`.
 * 
 * 2. Message Sender / Reply Helper (`message`):
 *    - `message.reply("text")` -> Replies to the specific message.
 *    - `message.send("text")` -> Sends a message to the chat.
 *    - `message.replyWithPhoto(streamOrUrl, { caption })` -> Sends photo stream.
 *    - `message.unsend(messageID)` -> Deletes message.
 * 
 * 3. Permission Levels (`role`):
 *    - Level 0: Normal User
 *    - Level 1: Premium User
 *    - Level 2: Group Admin
 *    - Level 3: Bot Admin
 *    - Level 4: Developer (Required for /shell and /eval)
 */

module.exports = {
        config: {
                name: "example",
                aliases: ["eg", "demo"],
                version: "2.0",
                author: "NeoKEX",
                countDown: 5,
                role: 0, // 0: User, 1: Premium, 2: Group Admin, 3: Bot Admin, 4: Developer
                description: {
                        vi: "Lệnh mẫu cho GrammChatBot Telegram",
                        en: "Sample template command for GrammChatBot Telegram"
                },
                category: "utility",
                guide: {
                        vi: "{pn} [text]",
                        en: "{pn} [text]"
                }
        },

        langs: {
                vi: {
                        hello: "Xin chào %1! ID Telegram của bạn là %2.",
                        missingArgs: "Vui lòng nhập văn bản!"
                },
                en: {
                        hello: "Hello %1! Your Telegram ID is %2.",
                        missingArgs: "Please enter text!"
                }
        },

        onStart: async function ({ bot, ctx, api, message, event, args, role, commandName, getLang }) {
                const userName = ctx.from?.first_name || "User";
                const userId = ctx.from?.id;

                await message.reply(getLang("hello", userName, userId));

                if (args.length > 0) {
                        await ctx.reply(`Passed arguments: ${args.join(", ")}`);
                }
        }
};