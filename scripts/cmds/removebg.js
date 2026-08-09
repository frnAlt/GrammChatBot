/**
 * AI Background Removal Command: /removebg (/nobg /bgremove)
 * Removes background from replied image and streams transparent image output directly.
 */

const axios = require("axios");

module.exports = {
        config: {
                name: "removebg",
                aliases: ["nobg", "bgremove", "rbg"],
                version: "2.0",
                author: "frnAlt & Gtajisan",
                countDown: 10,
                role: 0,
                description: {
                        vi: "Xóa nền bức ảnh (Stream trực tiếp)",
                        en: "Remove background from an image (Direct Stream)"
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
                        return message.reply("✂ Please reply to an image message with /removebg");
                }

                await message.reply("✂ Removing background... Please wait.");

                try {
                        const photoArray = replyObj.photo;
                        const fileId = photoArray ? photoArray[photoArray.length - 1].file_id : replyObj.document.file_id;
                        const fileInfo = await ctx.api.getFile(fileId);
                        const inputImgUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${fileInfo.file_path}`;

                        // Use removebg transparent stream service
                        const removeBgUrl = `https://image.pollinations.ai/prompt/transparent%20background%20isolated%20subject%20no%20background?image=${encodeURIComponent(inputImgUrl)}`;

                        const response = await axios.get(removeBgUrl, { responseType: "stream" });

                        await ctx.replyWithDocument({ source: response.data, filename: "removed_bg.png" }, {
                                caption: "✂ <b>Background Removed (PNG Stream)</b>",
                                parse_mode: "HTML",
                                reply_to_message_id: ctx.message?.message_id
                        });
                } catch (err) {
                        message.reply(`❌ Failed to remove background: ${err.message}`);
                }
        }
};
