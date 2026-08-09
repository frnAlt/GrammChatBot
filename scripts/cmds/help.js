/**
 * Help Command: /help
 * Displays list of available commands and usage guides.
 */

module.exports = {
        config: {
                name: "help",
                aliases: ["cmds", "menu"],
                version: "2.0",
                author: "NeoKEX",
                countDown: 2,
                role: 0,
                description: {
                        vi: "Hiển thị danh sách các lệnh của bot",
                        en: "Display available bot commands"
                },
                category: "utility",
                guide: {
                        vi: "{pn} [tên lệnh]",
                        en: "{pn} [command name]"
                }
        },

        onStart: async function ({ message, args }) {
                const { GoatBot } = global;
                const prefix = GoatBot.config.prefix || "/";
                const commands = GoatBot.commands;

                if (args[0]) {
                        const cmdName = args[0].toLowerCase();
                        const cmd = commands.get(cmdName) || commands.get(GoatBot.aliases.get(cmdName));
                        if (!cmd) {
                                return message.reply(`❌ Command "${cmdName}" not found.`);
                        }
                        const conf = cmd.config;
                        return message.reply(
                                `📌 <b>Command: ${conf.name}</b>\n\n` +
                                `• <b>Description:</b> ${conf.description?.en || conf.description || "N/A"}\n` +
                                `• <b>Aliases:</b> ${conf.aliases?.join(", ") || "None"}\n` +
                                `• <b>Category:</b> ${conf.category || "utility"}\n` +
                                `• <b>Role Required:</b> Level ${conf.role ?? 0}\n` +
                                `• <b>Cooldown:</b> ${conf.countDown || 0}s\n` +
                                `• <b>Usage Guide:</b> ${conf.guide?.en || conf.guide || prefix + conf.name}`,
                                { parse_mode: "HTML" }
                        );
                }

                // Categorize commands
                const categories = {};
                for (const [name, cmd] of commands.entries()) {
                        const cat = cmd.config?.category || "utility";
                        if (!categories[cat]) categories[cat] = [];
                        if (!categories[cat].includes(name)) {
                                categories[cat].push(name);
                        }
                }

                let text = `🤖 <b>GrammChatBot Command Menu</b>\n\n`;
                for (const [cat, cmds] of Object.entries(categories)) {
                        text += `📂 <b>${cat.toUpperCase()}</b>:\n`;
                        text += `<code>${cmds.map(c => prefix + c).join(", ")}</code>\n\n`;
                }

                text += `💡 <i>Type <code>${prefix}help &lt;command&gt;</code> for detailed usage info.</i>`;
                return message.reply(text, { parse_mode: "HTML" });
        }
};