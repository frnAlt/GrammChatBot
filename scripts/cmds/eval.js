/**
 * Developer Command: /eval
 * Evaluates raw JavaScript code inside the bot runtime context.
 * Role Level: 4 (Developer Only)
 */

const { removeHomeDir, log } = global.utils;

module.exports = {
        config: {
                name: "eval",
                aliases: ["evaluate", "js"],
                version: "2.0",
                author: "NTKhang & Modded by NeoKEX",
                countDown: 1,
                role: 4, // Strictly Developer Level 4
                description: {
                        vi: "Thực thi đoạn code JavaScript trực tiếp",
                        en: "Evaluate raw JavaScript code in runtime"
                },
                category: "developer",
                guide: {
                        vi: "{pn} <đoạn code JS>",
                        en: "{pn} <JS code>"
                }
        },

        langs: {
                vi: {
                        error: "✗ Đã xảy ra lỗi khi thực thi code:"
                },
                en: {
                        error: "✗ An error occurred while evaluating code:"
                }
        },

        onStart: async function ({ bot, ctx, api, args, message, event, role, getLang }) {
                if (role < 4) {
                        return message.reply("⛔ Permission Denied: /eval is strictly locked to Developer Level 4.");
                }

                const code = args.join(" ");
                if (!code) {
                        return message.reply("⚠ Please enter JavaScript code to evaluate.");
                }

                function output(msg) {
                        if (typeof msg === "number" || typeof msg === "boolean" || typeof msg === "function") {
                                msg = msg.toString();
                        } else if (msg instanceof Map) {
                                msg = `Map(${msg.size}) ` + JSON.stringify(Object.fromEntries(msg), null, 2);
                        } else if (typeof msg === "object") {
                                msg = JSON.stringify(msg, null, 2);
                        } else if (typeof msg === "undefined") {
                                msg = "undefined";
                        }
                        message.reply(msg);
                }

                const evalWrapper = `
                (async () => {
                        try {
                                ${code}
                        } catch(err) {
                                message.reply("${getLang("error")}\\n" + (err.stack ? err.stack : JSON.stringify(err, null, 2)));
                        }
                })()`;

                try {
                        eval(evalWrapper);
                } catch (e) {
                        message.reply(`✗ Syntax/Execution Error:\n${e.message}`);
                }
        }
};