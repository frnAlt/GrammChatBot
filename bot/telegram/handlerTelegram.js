/**
 * Telegram Event & Command Handler
 * Bridges Telegram grammY updates to GoatBot V2 dynamic command and event engine.
 * Includes Levenshtein distance smart suggestions, 5-level role permission matrix, and stream-based media helper.
 */

const { InputFile } = require("grammy");
const fs = require("fs-extra");
const path = require("path");
const log = require("../../logger/log.js");
const { findClosestCommand } = require("../../utils/levenshtein.js");

/**
 * Creates stream-safe InputFile object for Telegram media
 * Streams avoid loading full buffers into RAM, ensuring 512MB RAM compatibility for free-tier deployments.
 */
function createStreamInputFile(mediaInput) {
        if (!mediaInput) return null;
        if (typeof mediaInput === "string") {
                if (mediaInput.startsWith("http://") || mediaInput.startsWith("https://")) {
                        return new InputFile({ url: mediaInput });
                }
                if (fs.existsSync(mediaInput)) {
                        return new InputFile(fs.createReadStream(mediaInput));
                }
                return new InputFile(mediaInput);
        }
        if (Buffer.isBuffer(mediaInput)) {
                return new InputFile(mediaInput);
        }
        if (typeof mediaInput.pipe === "function") {
                return new InputFile(mediaInput);
        }
        return new InputFile(mediaInput);
}

/**
 * Resolves user permission role matrix:
 * Level 4: Developer (devUsers in config)
 * Level 3: Bot Admin (adminBot in config)
 * Level 2: Group Admin (Telegram group admin/creator via ctx.getChatMember)
 * Level 1: Premium User (premiumUsers in config or DB premium flag)
 * Level 0: Normal User
 */
async function getUserRole(ctx, threadData, userData) {
        const senderID = ctx.from?.id?.toString();
        if (!senderID) return 0;

        const config = global.GoatBot?.config || {};
        const devUsers = (config.devUsers || []).map(String);
        const adminBot = (config.adminBot || []).map(String);
        const premiumUsers = (config.premiumUsers || []).map(String);

        if (devUsers.includes(senderID)) return 4;
        if (adminBot.includes(senderID)) return 3;

        // Check Group Admin (Level 2)
        if (ctx.chat?.type === "group" || ctx.chat?.type === "supergroup") {
                try {
                        const member = await ctx.getChatMember(ctx.from.id);
                        if (member.status === "administrator" || member.status === "creator") {
                                return 2;
                        }
                } catch (e) {
                        // ignore error
                }
        }

        // Check Premium User (Level 1)
        if (premiumUsers.includes(senderID) || userData?.isPremium === true) {
                return 1;
        }

        return 0;
}

function canUseCommand(userRole, needRole) {
        if (needRole === undefined || needRole === null) needRole = 0;
        if (userRole === 4 || userRole === 3) return true; // Dev and Bot Admin have full command access
        if (userRole === 1) return needRole === 0 || needRole === 1; // Premium User can use Level 0 and 1
        return needRole <= userRole;
}

/**
 * Build helper wrapper object for message sending
 */
function createMessageHelper(ctx) {
        return {
                reply: async (content, options = {}) => {
                        if (!content) return;
                        if (typeof content === "string") {
                                return await ctx.reply(content, { reply_to_message_id: ctx.message?.message_id, ...options });
                        }
                        if (typeof content === "object") {
                                const text = content.body || content.text || "";
                                const opts = { reply_to_message_id: ctx.message?.message_id, ...options };
                                if (content.attachment) {
                                        const attachment = Array.isArray(content.attachment) ? content.attachment[0] : content.attachment;
                                        const inputFile = createStreamInputFile(attachment);
                                        return await ctx.replyWithPhoto(inputFile, { caption: text, ...opts });
                                }
                                if (text) {
                                        return await ctx.reply(text, opts);
                                }
                        }
                },
                send: async (content, options = {}) => {
                        if (!content) return;
                        if (typeof content === "string") {
                                return await ctx.reply(content, options);
                        }
                        if (typeof content === "object") {
                                const text = content.body || content.text || "";
                                if (content.attachment) {
                                        const attachment = Array.isArray(content.attachment) ? content.attachment[0] : content.attachment;
                                        const inputFile = createStreamInputFile(attachment);
                                        return await ctx.replyWithPhoto(inputFile, { caption: text, ...options });
                                }
                                if (text) {
                                        return await ctx.reply(text, options);
                                }
                        }
                },
                unsend: async (messageID) => {
                        try {
                                const targetID = messageID || ctx.message?.message_id;
                                if (targetID) {
                                        await ctx.api.deleteMessage(ctx.chat.id, targetID);
                                }
                        } catch (err) {
                                log.warn("UNSEND", `Could not delete message: ${err.message}`);
                        }
                },
                react: async (emoji) => {
                        try {
                                if (ctx.react && ctx.message?.message_id) {
                                        await ctx.react(emoji);
                                } else if (ctx.api.setMessageReaction && ctx.message?.message_id) {
                                        await ctx.api.setMessageReaction(ctx.chat.id, ctx.message.message_id, [{ type: "emoji", emoji }]);
                                }
                        } catch (e) {
                                // reaction unsupported or restricted
                        }
                },
                replyWithPhoto: async (photo, options = {}) => {
                        const inputFile = createStreamInputFile(photo);
                        return await ctx.replyWithPhoto(inputFile, { reply_to_message_id: ctx.message?.message_id, ...options });
                },
                replyWithVideo: async (video, options = {}) => {
                        const inputFile = createStreamInputFile(video);
                        return await ctx.replyWithVideo(inputFile, { reply_to_message_id: ctx.message?.message_id, ...options });
                },
                replyWithAudio: async (audio, options = {}) => {
                        const inputFile = createStreamInputFile(audio);
                        return await ctx.replyWithAudio(inputFile, { reply_to_message_id: ctx.message?.message_id, ...options });
                },
                replyWithDocument: async (doc, options = {}) => {
                        const inputFile = createStreamInputFile(doc);
                        return await ctx.replyWithDocument(inputFile, { reply_to_message_id: ctx.message?.message_id, ...options });
                }
        };
}

/**
 * Handle incoming Telegram Update
 */
async function handleTelegramUpdate(ctx) {
        if (!ctx.message && !ctx.editedMessage && !ctx.callbackQuery) return;

        const messageObj = ctx.message || ctx.editedMessage;
        if (!messageObj) return;

        const body = messageObj.text || messageObj.caption || "";
        const senderID = ctx.from?.id?.toString();
        const threadID = ctx.chat?.id?.toString();

        if (!senderID || !threadID) return;

        const { GoatBot, db, utils } = global;
        const config = GoatBot.config;
        const prefix = config.prefix || "/";

        const message = createMessageHelper(ctx);

        // Fetch thread & user DB objects safely
        let threadData = {};
        let userData = {};
        if (db?.threadsData?.get) threadData = await db.threadsData.get(threadID) || {};
        if (db?.usersData?.get) userData = await db.usersData.get(senderID) || {};

        const role = await getUserRole(ctx, threadData, userData);

        // Build mock event object for compatibility with legacy GoatBot V2 commands
        const event = {
                body,
                senderID,
                threadID,
                messageID: messageObj.message_id,
                isGroup: ctx.chat?.type === "group" || ctx.chat?.type === "supergroup",
                type: "message",
                messageReply: messageObj.reply_to_message ? {
                        messageID: messageObj.reply_to_message.message_id,
                        senderID: messageObj.reply_to_message.from?.id?.toString(),
                        body: messageObj.reply_to_message.text || messageObj.reply_to_message.caption || ""
                } : null,
                telegramCtx: ctx
        };

        // ————————————————— HANDLE REPLIES (onReply) ————————————————— //
        if (messageObj.reply_to_message) {
                const replyMsgID = messageObj.reply_to_message.message_id;
                const replyData = GoatBot.onReply.get(replyMsgID);

                if (replyData) {
                        const { commandName, author } = replyData;
                        const command = GoatBot.commands.get(commandName);
                        if (command && typeof command.onReply === "function") {
                                const getLang = (key, ...args) => utils.getText(command, key, ...args);
                                try {
                                        await command.onReply({
                                                bot: GoatBot,
                                                ctx,
                                                api: ctx.api,
                                                message,
                                                event,
                                                args: body.trim().split(/\s+/),
                                                Reply: replyData,
                                                ReplyData: replyData,
                                                replyData,
                                                role,
                                                commandName,
                                                getLang,
                                                threadsData: db.threadsData,
                                                usersData: db.usersData,
                                                dashBoardData: db.dashBoardData,
                                                globalData: db.globalData
                                        });
                                } catch (err) {
                                        log.error("ON_REPLY", `Error executing onReply for command ${commandName}: ${err.message}`);
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
                                        bot: GoatBot,
                                        ctx,
                                        api: ctx.api,
                                        message,
                                        event,
                                        role,
                                        commandName,
                                        getLang,
                                        threadsData: db.threadsData,
                                        usersData: db.usersData,
                                        dashBoardData: db.dashBoardData,
                                        globalData: db.globalData
                                });
                        } catch (err) {
                                log.error("ON_CHAT", `Error in onChat script (${commandName}): ${err.message}`);
                        }
                }
        }

        // ————————————————— COMMAND PARSING ————————————————— //
        let commandName = "";
        let args = [];
        let isCommand = false;

        if (body.startsWith(prefix)) {
                const rawCmd = body.slice(prefix.length).trim().split(/\s+/);
                commandName = rawCmd.shift().toLowerCase();
                args = rawCmd;
                isCommand = true;
        } else if (config.noPrefix && (role === 3 || role === 4)) {
                // Developers & Bot Admins can trigger without prefix if enabled
                const rawCmd = body.trim().split(/\s+/);
                const testName = rawCmd[0]?.toLowerCase();
                if (GoatBot.commands.has(testName) || GoatBot.aliases.has(testName)) {
                        commandName = testName;
                        args = rawCmd.slice(1);
                        isCommand = true;
                }
        }

        if (!isCommand || !commandName) return;

        // Resolve alias if used
        if (GoatBot.aliases.has(commandName)) {
                commandName = GoatBot.aliases.get(commandName);
        }

        const command = GoatBot.commands.get(commandName);
        if (!command) {
                // Typo handling with Levenshtein distance
                const allAvailableCmds = Array.from(GoatBot.commands.keys());
                const match = findClosestCommand(commandName, allAvailableCmds);

                if (match) {
                        await message.reply(`Command not found. Did you mean ${prefix}${match.command}?`);
                } else if (config.hideNotiMessage?.commandNotFound === false) {
                        await message.reply(`⚠ Command "${commandName}" not found. Type ${prefix}help to see available commands.`);
                }
                return;
        }

        // Enforce Permission Check Matrix
        const needRole = command.config?.role ?? 0;
        if (!canUseCommand(role, needRole)) {
                return message.reply(`⛔ Permission Denied: You need Role Level ${needRole} to use command "${commandName}". Your current Role Level is ${role}.`);
        }

        // Prepare Language helper
        const getLang = (key, ...args) => utils.getText(command, key, ...args);

        // Execute Command onStart
        try {
                log.info("EXECUTE_CMD", `[User: ${senderID} | Chat: ${threadID}] Running command: /${commandName}`);
                await command.onStart({
                        bot: GoatBot,
                        ctx,
                        api: ctx.api,
                        message,
                        event,
                        args,
                        role,
                        commandName,
                        getLang,
                        threadsData: db.threadsData,
                        usersData: db.usersData,
                        dashBoardData: db.dashBoardData,
                        globalData: db.globalData
                });
        } catch (err) {
                log.error("COMMAND_ERROR", `Failed executing command /${commandName}: ${err.stack || err.message}`);
                message.reply(`❌ An error occurred while executing command /${commandName}:\n\n${err.message}`);
        }
}

module.exports = { handleTelegramUpdate, getUserRole, canUseCommand, createMessageHelper };
