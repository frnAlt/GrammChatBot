/**
 * Stats Command: /stats
 * Displays system memory, uptime, and bot statistics.
 */

module.exports = {
        config: {
                name: "stats",
                aliases: ["botstats", "status", "uptime"],
                version: "2.0",
                author: "NeoKEX",
                countDown: 5,
                role: 0,
                description: {
                        vi: "Hiển thị thông số bot và bộ nhớ hệ thống",
                        en: "Display bot statistics and memory usage"
                },
                category: "utility",
                guide: {
                        vi: "{pn}",
                        en: "{pn}"
                }
        },

        onStart: async function ({ message }) {
                const { GoatBot, utils } = global;
                const mem = process.memoryUsage();
                const uptimeSec = Math.floor((Date.now() - GoatBot.startTime) / 1000);
                const uptimeFormatted = utils.convertTime ? utils.convertTime(uptimeSec * 1000) : `${uptimeSec}s`;

                return message.reply(
                        `📊 <b>GrammChatBot System Stats</b>\n\n` +
                        `🤖 <b>Bot Name:</b> @${GoatBot.botInfo?.username || "GrammChatBot"}\n` +
                        `⏱ <b>Uptime:</b> ${uptimeFormatted}\n` +
                        `⚙ <b>Loaded Commands:</b> ${GoatBot.commands.size}\n` +
                        `📂 <b>Loaded Events:</b> ${GoatBot.eventCommands.size}\n` +
                        `💾 <b>Heap Memory Used:</b> ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB\n` +
                        `🖥 <b>RSS Memory Total:</b> ${(mem.rss / 1024 / 1024).toFixed(2)} MB\n` +
                        `⚡ <b>Node.js Version:</b> ${process.version}`,
                        { parse_mode: "HTML" }
                );
        }
};
