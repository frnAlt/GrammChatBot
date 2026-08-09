/**
 * Ping Command: /ping
 * Measures bot response latency.
 */

module.exports = {
        config: {
                name: "ping",
                aliases: ["pong"],
                version: "2.0",
                author: "frnAlt & Gtajisan",
                countDown: 2,
                role: 0,
                description: {
                        vi: "Kiểm tra độ trễ phản hồi của bot",
                        en: "Check bot response latency"
                },
                category: "utility",
                guide: {
                        vi: "{pn}",
                        en: "{pn}"
                }
        },

        onStart: async function ({ message, ctx }) {
                const startTime = Date.now();
                const sentMsg = await ctx.reply("🏓 Pinging...");
                const latency = Date.now() - startTime;

                if (sentMsg) {
                        await ctx.api.editMessageText(ctx.chat.id, sentMsg.message_id, `🏓 <b>Pong!</b> Latency: <code>${latency}ms</code>`, { parse_mode: "HTML" });
                } else {
                        await message.reply(`🏓 <b>Pong!</b> Latency: <code>${latency}ms</code>`, { parse_mode: "HTML" });
                }
        }
};
