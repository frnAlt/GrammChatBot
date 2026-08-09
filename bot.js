/**
 * Core Telegram Bot Engine (bot.js)
 * Integrates grammY update stream with system/api-adapter.js for Goatbot V2 compatibility
 */

const { createFcaApiWrapper, createFcaEventObject } = require("./system/api-adapter.js");
const { getUserRole, canUseCommand } = require("./bot/telegram/handlerTelegram.js");
const { findClosestCommand } = require("./utils/levenshtein.js");
const log = require("./logger/log.js");

async function handleTelegramEvent(ctx) {
        if (!ctx.message && !ctx.editedMessage && !ctx.callbackQuery) return;

        const { GoatBot, db, utils } = global;
        const config = GoatBot.config;
        const prefix = config.prefix || "/";

        // Generate FCA-compatible `api` and `event` objects via system/api-adapter.js
        const api = createFcaApiWrapper(ctx);
        const event = createFcaEventObject(ctx);

        if (!event.senderID || !event.threadID) return;

        // Fetch user & thread DB data
        let threadData = {};
        let userData = {};
        if (db?.threadsData?.get) threadData = await db.threadsData.get(event.threadID) || {};
        if (db?.usersData?.get) userData = await db.usersData.get(event.senderID) || {};

        const role = await getUserRole(ctx, threadData, userData);

        // Helper `message` wrapper
        const message = {
                reply: (text, options) => api.sendMessage(text, event.threadID, null, event.messageID),
                send: (text, options) => api.sendMessage(text, event.threadID),
                unsend: (msgID) => api.unsendMessage(msgID || event.messageID),
                react: (emoji) => api.setMessageReaction(emoji, event.messageID, event.threadID)
        };

        // ————————————————— HANDLE REPLIES (onReply) ————————————————— //
        if (event.messageReply) {
                const replyData = GoatBot.onReply.get(event.messageReply.messageID);
                if (replyData) {
                        const { commandName } = replyData;
                        const command = GoatBot.commands.get(commandName);
                        if (command && typeof command.onReply === "function") {
                                const getLang = (key, ...args) => utils.getText(command, key, ...args);
                                try {
                                        await command.onReply({
                                                api,
                                                event,
                                                message,
                                                args: event.body.trim().split(/\s+/),
                                                Reply: replyData,
                                                replyData,
                                                role,
                                                commandName,
                                                getLang,
                                                threadsData: db.threadsData,
                                                usersData: db.usersData
                                        });
                                } catch (err) {
                                        log.error("ON_REPLY", `Error executing onReply (${commandName}): ${err.message}`);
                                }
                        }
                }
        }

        // ————————————————— HANDLE ONCHAT LISTENERS ————————————————— //
        for (const commandName of GoatBot.onChat) {
                const command = GoatBot.commands.get(commandName);
                if (command && typeof command.onChat === "function") {
                        try {
                                const getLang = (key, ...args) => utils.getText(command, key, ...args);
                                await command.onChat({
                                        api,
                                        event,
                                        message,
                                        role,
                                        commandName,
                                        getLang,
                                        threadsData: db.threadsData,
                                        usersData: db.usersData
                                });
                        } catch (err) {
                                log.error("ON_CHAT", `Error executing onChat (${commandName}): ${err.message}`);
                        }
                }
        }

        // ————————————————— COMMAND PARSING ————————————————— //
        let commandName = "";
        let args = [];
        let isCommand = false;

        if (event.body.startsWith(prefix)) {
                const rawCmd = event.body.slice(prefix.length).trim().split(/\s+/);
                commandName = rawCmd.shift().toLowerCase();
                args = rawCmd;
                isCommand = true;
        } else if (config.noPrefix && (role === 3 || role === 4)) {
                const rawCmd = event.body.trim().split(/\s+/);
                const testName = rawCmd[0]?.toLowerCase();
                if (GoatBot.commands.has(testName) || GoatBot.aliases.has(testName)) {
                        commandName = testName;
                        args = rawCmd.slice(1);
                        isCommand = true;
                }
        }

        if (!isCommand || !commandName) return;

        // Resolve alias
        if (GoatBot.aliases.has(commandName)) {
                commandName = GoatBot.aliases.get(commandName);
        }

        const command = GoatBot.commands.get(commandName);
        if (!command) {
                // Typo handling with Levenshtein distance
                const allCmds = Array.from(GoatBot.commands.keys());
                const match = findClosestCommand(commandName, allCmds);

                if (match) {
                        await message.reply(`Command not found. Did you mean ${prefix}${match.command}?`);
                } else if (config.hideNotiMessage?.commandNotFound === false) {
                        await message.reply(`⚠ Command "${commandName}" not found. Type ${prefix}help to see available commands.`);
                }
                return;
        }

        // Role Permission Matrix
        const needRole = command.config?.role ?? 0;
        if (!canUseCommand(role, needRole)) {
                return message.reply(`⛔ Permission Denied: You need Role Level ${needRole} to execute "${commandName}". Your current Role Level is ${role}.`);
        }

        // Language translation helper
        const getLang = (key, ...args) => utils.getText(command, key, ...args);

        // Execute Command onStart in native Goatbot FCA syntax
        try {
                log.info("EXECUTE_CMD", `[User: ${event.senderID} | Thread: ${event.threadID}] /${commandName}`);
                await command.onStart({
                        api,
                        event,
                        args,
                        message,
                        role,
                        commandName,
                        getLang,
                        threadsData: db.threadsData,
                        usersData: db.usersData,
                        dashBoardData: db.dashBoardData,
                        globalData: db.globalData
                });
        } catch (err) {
                log.error("COMMAND_ERROR", `Failed executing /${commandName}: ${err.stack || err.message}`);
                message.reply(`❌ Error executing command /${commandName}:\n\n${err.message}`);
        }
}

module.exports = { handleTelegramEvent };
