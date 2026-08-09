/**
 * AI Image Upscaling Command: /upscale (/4k /hd)
 * Upscales and enhances image quality, streaming the output directly to Telegram.
 */

const axios = require("axios");

module.exports = {
        config: {
                name: "upscale",
                aliases: ["4k", "hd", "enhance"],
                version: "2.0",
                author: "NeoKEX",
                countDown: 10,
                role: 0,
                description: {
                        vi: "Nâng cấp chất lượng ảnh lên 4K / HD",
                        en: "Upscale and enhance image quality to 4K / HD"
                },
                category: "ai-tools",
                guide: {
                        vi: "Reply 1 bức ảnh với lệnh {pn}",
                        en: "Reply to an image with {pn}"
                }
        },

        onStart: async function ({ ctx, message, event }) {
                const replyObj = event.telegramCtx?.message?.reply_to_message;

                if (!replyObj || (!replyObj.photo && !replyObj.document)) {
                        return message.reply("📸 Please reply to an image message with /upscale to enhance it.");
                }

                await message.reply("🔍 Upscaling image to 4K resolution... Please wait.");

                try {
                        const photoArray = replyObj.photo;
                        const fileId = photoArray ? photoArray[photoArray.length - 1].file_id : replyObj.document.file_id;
                        const fileInfo = await ctx.api.getFile(fileId);
                        const inputImgUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${fileInfo.file_path}`;

                        // Use upscale stream endpoint
                        const upscaleUrl = `https://image.pollinations.ai/prompt/masterpiece%20hyperrealistic%20high%20resolution%204k%20detail?image=${encodeURIComponent(inputImgUrl)}&width=2048&height=2048`;

                        const response = await axios.get(upscaleUrl, { responseType: "stream" });

                        await ctx.replyWithPhoto({ source: response.data }, {
                                caption: "🔍 <b>4K Upscaled Image</b>",
                                parse_mode: "HTML",
                                reply_to_message_id: ctx.message?.message_id
                        });
                } catch (err) {
                        message.reply(`❌ Failed to upscale image: ${err.message}`);
                }
        }
};
