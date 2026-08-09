/**
 * Admin Command: /admin (/premium /ban /unban)
 * Manages premium user subscriptions and user/group bans.
 * Role Level: 3 (Bot Admin) or 4 (Developer)
 */

module.exports = {
        config: {
                name: "admin",
                aliases: ["premium", "manage"],
                version: "2.0",
                author: "NeoKEX",
                countDown: 2,
                role: 3, // Level 3 Bot Admin or Level 4 Dev
                description: {
                        vi: "Quản lý thành viên Premium, Bot Admin và cấm người dùng",
                        en: "Manage Premium users, Bot Admins, and User Bans"
                },
                category: "admin",
                guide: {
                        vi: "{pn} premium add <userID>\n{pn} premium remove <userID>\n{pn} ban <userID>\n{pn} unban <userID>",
                        en: "{pn} premium add <userID>\n{pn} premium remove <userID>\n{pn} ban <userID>\n{pn} unban <userID>"
                }
        },

        onStart: async function ({ ctx, message, args, role }) {
                if (role < 3) {
                        return message.reply("⛔ Permission Denied: /admin requires Level 3 Bot Admin or Level 4 Developer access.");
                }

                const subCmd = args[0]?.toLowerCase();
                const action = args[1]?.toLowerCase();
                const targetID = args[2] || (ctx.message?.reply_to_message?.from?.id?.toString());

                const config = global.GoatBot.config;
                config.premiumUsers = config.premiumUsers || [];
                config.adminBot = config.adminBot || [];

                if (!subCmd) {
                        return message.reply(
                                "👑 <b>Admin Control Panel</b>\n\n" +
                                "• <code>/admin premium add &lt;userID&gt;</code> - Grant Premium (Level 1)\n" +
                                "• <code>/admin premium remove &lt;userID&gt;</code> - Revoke Premium\n" +
                                "• <code>/admin list</code> - List Premium users & Admins\n" +
                                "• <code>/admin ban &lt;userID&gt;</code> - Ban user from bot\n" +
                                "• <code>/admin unban &lt;userID&gt;</code> - Unban user",
                                { parse_mode: "HTML" }
                        );
                }

                if (subCmd === "list") {
                        const premiumList = config.premiumUsers.join(", ") || "None";
                        const adminList = config.adminBot.join(", ") || "None";
                        const devList = config.devUsers.join(", ") || "None";

                        return message.reply(
                                `📋 <b>Bot Access Lists</b>\n\n` +
                                `<b>Developers (Level 4):</b> ${devList}\n` +
                                `<b>Bot Admins (Level 3):</b> ${adminList}\n` +
                                `<b>Premium Users (Level 1):</b> ${premiumList}`,
                                { parse_mode: "HTML" }
                        );
                }

                if (subCmd === "premium") {
                        if (!targetID) return message.reply("⚠ Please specify a target User ID or reply to a message.");
                        if (action === "add") {
                                if (!config.premiumUsers.includes(targetID)) {
                                        config.premiumUsers.push(targetID);
                                        return message.reply(`✅ Granted Premium access (Level 1) to User ID: <code>${targetID}</code>`, { parse_mode: "HTML" });
                                }
                                return message.reply(`User <code>${targetID}</code> is already a Premium user.`, { parse_mode: "HTML" });
                        }
                        if (action === "remove") {
                                config.premiumUsers = config.premiumUsers.filter(id => id !== targetID);
                                return message.reply(`🗑 Removed Premium access from User ID: <code>${targetID}</code>`, { parse_mode: "HTML" });
                        }
                }

                if (subCmd === "ban") {
                        const banId = action || targetID;
                        if (!banId) return message.reply("⚠ Please specify User ID to ban.");
                        global.client.commandBanned = global.client.commandBanned || {};
                        global.client.commandBanned[banId] = true;
                        return message.reply(`🚫 Banned User ID <code>${banId}</code> from using the bot.`, { parse_mode: "HTML" });
                }

                if (subCmd === "unban") {
                        const unbanId = action || targetID;
                        if (!unbanId) return message.reply("⚠ Please specify User ID to unban.");
                        if (global.client.commandBanned?.[unbanId]) {
                                delete global.client.commandBanned[unbanId];
                        }
                        return message.reply(`✅ Unbanned User ID <code>${unbanId}</code>.`, { parse_mode: "HTML" });
                }
        }
};