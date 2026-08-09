/**
 * AI Image Generation Command: /image (/dalle /imagine)
 * Streams photo directly via axios response stream to Telegram without keeping buffers in memory.
 */

const axios = require("axios");

module.exports = {
        config: {
                name: "image",
                aliases: ["imagine", "dalle", "genimage"],
                version: "2.0",
                author: "frnAlt & Gtajisan",
                countDown: 10,
                role: 0,
                description: {
                        vi: "Tạo ảnh AI từ văn bản (Stream trực tiếp)",
                        en: "Generate AI image from text prompt (Direct Stream)"
                },
                category: "ai-tools",
                guide: {
                        vi: "{pn} <mo ta anh>",
                        en: "{pn} <prompt>"
                }
        },

        onStart: async function ({ ctx, message, args }) {
                const prompt = args.join(" ");
                if (!prompt) {
                        return message.reply("🎨 Please enter a prompt for image generation. Example: /image cybernetic cat in futuristic city");
                }

                await message.reply("🎨 Generating AI Image... Please wait.");

                try {
                        // Use open Pollinations.ai SDXL model endpoint
                        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;

                        // Stream response directly to Telegram
                        const response = await axios.get(imageUrl, { responseType: "stream" });

                        await ctx.replyWithPhoto({ source: response.data }, {
                                caption: `✨ <b>Generated Image</b>\n\n<b>Prompt:</b> ${prompt}`,
                                parse_mode: "HTML",
                                reply_to_message_id: ctx.message?.message_id
                        });
                } catch (err) {
                        message.reply(`❌ Failed to generate image: ${err.message}`);
                }
        }
};
