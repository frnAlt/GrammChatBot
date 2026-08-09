/**
 * AI Image Editing Command: /edit
 * Applies AI filters/transforms to replied images and streams the result directly.
 */

const axios = require("axios");

module.exports = {
        config: {
                name: "edit",
                aliases: ["imgedit", "filter"],
                version: "2.0",
                author: "NeoKEX",
                countDown: 10,
                role: 0,
                description: {
                        vi: "Chỉnh sửa hoặc áp dụng bộ lọc cho ảnh (Stream)",
                        en: "Apply AI edits/filters to an image (Stream)"
                },
                category: "ai-tools",
                guide: {
                        vi: "Reply 1 bức ảnh với lệnh: {pn} <phong cách / prompt>",
                        en: "Reply to an image with: {pn} <style / prompt>"
                }
        },

        onStart: async function ({ ctx, message, args, event }) {
                const prompt = args.join(" ") || "anime style cyberpunk";
                const replyObj = event.telegramCtx?.message?.reply_to_message;

                if (!replyObj || (!replyObj.photo && !replyObj.document)) {
                        return message.reply("🖼 Please reply to an image message with /edit <style/prompt>");
                }

                await message.reply("🪄 Applying AI image edit... Please wait.");

                try {
                        // Get photo file link from Telegram
                        const photoArray = replyObj.photo;
                        const fileId = photoArray ? photoArray[photoArray.length - 1].file_id : replyObj.document.file_id;
                        const fileInfo = await ctx.api.getFile(fileId);
                        const inputImgUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${fileInfo.file_path}`;

                        // Render modified image stream using open image transform API
                        const editUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + " image transform")}?image=${encodeURIComponent(inputImgUrl)}&width=1024&height=1024`;

                        const response = await axios.get(editUrl, { responseType: "stream" });

                        await ctx.replyWithPhoto({ source: response.data }, {
                                caption: `✨ <b>Edited Image</b>\n<b>Style:</b> ${prompt}`,
                                parse_mode: "HTML",
                                reply_to_message_id: ctx.message?.message_id
                        });
                } catch (err) {
                        message.reply(`❌ Failed to edit image: ${err.message}`);
                }
        }
};