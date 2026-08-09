/**
 * Developer Command: /shell
 * Executes shell terminal commands on the host machine.
 * Role Level: 4 (Developer Only)
 */

const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

module.exports = {
        config: {
                name: "shell",
                aliases: ["sh", "cmd", "exec"],
                version: "2.0",
                author: "NeoKEX",
                countDown: 1,
                role: 4, // Strictly Developer Level 4
                description: {
                        vi: "Thực thi lệnh shell trên hệ thống",
                        en: "Execute shell command on host server"
                },
                category: "developer",
                guide: {
                        vi: "{pn} <command>",
                        en: "{pn} <command>"
                }
        },

        langs: {
                vi: {
                        missingCommand: "⚠ Vui lòng nhập lệnh shell cần thực thi",
                        executing: "⚙ Đang thực thi lệnh...",
                        output: "✓ Kết quả:\n\n%1",
                        error: "✗ Lỗi:\n\n%1",
                        timeout: "⚠ Lệnh thực thi quá lâu (timeout 30s)"
                },
                en: {
                        missingCommand: "⚠ Please enter a shell command to execute",
                        executing: "⚙ Executing command...",
                        output: "✓ Output:\n\n%1",
                        error: "✗ Error:\n\n%1",
                        timeout: "⚠ Execution timeout (30s)"
                }
        },

        onStart: async function ({ message, args, role, getLang }) {
                if (role < 4) {
                        return message.reply("⛔ Permission Denied: /shell is strictly locked to Developer Level 4.");
                }

                const command = args.join(" ");
                if (!command) {
                        return message.reply(getLang("missingCommand"));
                }

                await message.reply(getLang("executing"));

                try {
                        const { stdout, stderr } = await execPromise(command, {
                                timeout: 30000,
                                maxBuffer: 1024 * 1024 * 10
                        });

                        let output = "";
                        if (stdout) output += stdout;
                        if (stderr) output += stderr;

                        if (!output) output = "Command executed successfully (no output)";

                        if (output.length > 3500) {
                                output = output.substring(0, 3497) + "...";
                        }

                        return message.reply(getLang("output", output));
                } catch (error) {
                        let errorMsg = error.message;
                        if (errorMsg.includes("ETIMEDOUT") || errorMsg.includes("timeout")) {
                                return message.reply(getLang("timeout"));
                        }

                        if (errorMsg.length > 3500) {
                                errorMsg = errorMsg.substring(0, 3497) + "...";
                        }

                        return message.reply(getLang("error", errorMsg));
                }
        }
};