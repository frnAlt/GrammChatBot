// Universal module resolver for aliases and TypeScript/ESM transpilation
require("./func/moduleResolver.js");

const { createFcaApiWrapper, createFcaEventObject } = require("./system/api-adapter.js");
const { getUserRole, canUseCommand } = require("./bot/telegram/handlerTelegram.js");
const { findClosestCommand } = require("./utils/levenshtein.js");
const handleReply = require("./includes/handleReply.js");
const handleReaction = require("./includes/handleReaction.js");
const handleEvent = require("./includes/handleEvent.js");
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

        const OutputClass = require("./func/outputClass.js");
        let activeCmd = "";

        const message = {
                reply: (text, options) => api.sendMessage(text, event.threadID, null, event.messageID),
                send: (text, options) => api.sendMessage(text, event.threadID),
                unsend: (msgID) => api.unsendMessage(msgID || event.messageID),
                react: (emoji) => api.setMessageReaction(emoji, event.messageID, event.threadID),
                reaction: (emoji) => api.setMessageReaction(emoji, event.messageID, event.threadID),
                replyStyled: (content, style) => output.replyStyled(content, style),
                sendStyled: (content, style) => output.sendStyled(content, style),
                SyntaxError: async function (targetCommand = activeCmd) {
                        const target = targetCommand || activeCmd;
                        const syntaxMsg = utils.getText({ lang: config.language || "en", head: "handlerEvents" }, "commandSyntaxError", prefix, target) || `⚠ Wrong syntax. Type ${prefix}help ${target} for detailed usage.`;
                        return await api.sendMessage(syntaxMsg, event.threadID, null, event.messageID);
                }
        };

        const output = event.output || new OutputClass({ api, event, message });

        const input = event.input || {
                body: event.body || "",
                args: [],
                arguments: [],
                senderID: event.senderID,
                threadID: event.threadID,
                messageID: event.messageID,
                sid: event.senderID,
                tid: event.threadID,
                type: event.type || "message",
                logMessageType: event.logMessageType || null,
                logMessageData: event.logMessageData || null,
                isFacebook: false,
                isTelegram: true,
                isGroup: event.isGroup ?? false,
                isAdmin: role >= 2,
                isDev: role >= 4,
                role,
                censor: (str) => String(str || ""),
                toString: () => String(event.body || ""),
                ...event
        };

        const getLang = (cmd, key, ...args) => utils.getText(cmd, key, ...args);

        // ————————————————— SYSTEM LISTENERS (/includes) ————————————————— //
        if (GoatBot.eventsOff !== true) {
                await handleReply({ api, event, message, role, input, output, threadsData: db.threadsData, usersData: db.usersData, threadsDB: db.threadsData, usersDB: db.usersData, globalDB: db.globalData, getLang: (key, ...args) => getLang(null, key, ...args) });
                await handleReaction({ api, event, message, role, input, output, threadsData: db.threadsData, usersData: db.usersData, threadsDB: db.threadsData, usersDB: db.usersData, globalDB: db.globalData, getLang: (key, ...args) => getLang(null, key, ...args) });
                await handleEvent({ api, event, message, role, input, output, threadsData: db.threadsData, usersData: db.usersData, threadsDB: db.threadsData, usersDB: db.usersData, globalDB: db.globalData });
        }

        // ————————————————— HANDLE ONCHAT LISTENERS ————————————————— //
        for (const commandName of GoatBot.onChat) {
                const command = GoatBot.commands.get(commandName);
                if (command && typeof command.onChat === "function") {
                        try {
                                const cmdLang = (key, ...args) => getLang(command, key, ...args);
                                await command.onChat({
                                        api,
                                        event,
                                        message,
                                        input,
                                        output,
                                        role,
                                        commandName,
                                        getLang: cmdLang,
                                        threadsData: db.threadsData,
                                        usersData: db.usersData,
                                        threadsDB: db.threadsData,
                                        usersDB: db.usersData,
                                        globalDB: db.globalData
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

        if (event.body && typeof event.body === "string") {
                const trimmedBody = event.body.trim();
                if (trimmedBody.startsWith(prefix)) {
                        const rawCmd = trimmedBody.slice(prefix.length).trim().split(/\s+/);
                        commandName = rawCmd.shift().toLowerCase();
                        args = rawCmd;
                        isCommand = true;
                } else {
                        const rawCmd = trimmedBody.split(/\s+/);
                        const testName = rawCmd[0]?.toLowerCase();
                        let targetCmdName = testName;
                        if (GoatBot.aliases.has(testName)) {
                                targetCmdName = GoatBot.aliases.get(testName);
                        }
                        const targetCmd = GoatBot.commands.get(targetCmdName);
                        if (targetCmd && (targetCmd.noPrefix || targetCmd.config?.noPrefix || (config.noPrefix && (role === 3 || role === 4)))) {
                                commandName = targetCmdName;
                                args = rawCmd.slice(1);
                                isCommand = true;
                        }
                }
        }

        if (!isCommand || !commandName) {
                // Auto-reply matcher from Response Database
                const responseDB = global.db?.responseDB || global.responseDB;
                if (responseDB && typeof responseDB.get === "function" && event.body) {
                        try {
                                const matched = responseDB.get(event.body.trim(), { threadID: event.threadID });
                                if (matched && matched.reply) {
                                        return message.reply(matched.reply);
                                }
                        } catch (_) {}
                }
                return;
        }

        // Bot maintenance / OFF mode check
        if (GoatBot.botOff === true && role < 2) {
                return;
        }

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
        const cmdGetLang = (key, ...args) => getLang(command, key, ...args);

        activeCmd = commandName;
        input.args = args;
        input.arguments = args;

        // Execute Command onStart in native Goatbot FCA / Cassidy syntax
        try {
                log.info("EXECUTE_CMD", `[User: ${event.senderID} | Thread: ${event.threadID}] /${commandName}`);
                await command.onStart({
                        api,
                        event,
                        args,
                        arguments: args,
                        message,
                        input,
                        output,
                        role,
                        commandName,
                        getLang: cmdGetLang,
                        threadsData: db.threadsData,
                        usersData: db.usersData,
                        dashBoardData: db.dashBoardData,
                        globalData: db.globalData,
                        usersDB: db.usersData,
                        threadsDB: db.threadsData,
                        globalDB: db.globalData
                });
        } catch (err) {
                log.error("COMMAND_ERROR", `Failed executing /${commandName}: ${err.stack || err.message}`);
                message.reply(`❌ Error executing command /${commandName}:\n\n${err.message}`);
        }
}

module.exports = { handleTelegramEvent };
