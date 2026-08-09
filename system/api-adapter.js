/**
 * FCA to TCA (Facebook Chat API to Telegram Chat API) Adapter Layer
 * 
 * Intercepts Telegram's grammY update context (ctx) and constructs:
 * 1. An FCA-compatible `api` object (api.sendMessage, api.unsendMessage, api.getUserInfo, etc.)
 * 2. An FCA-compatible `event` object (event.threadID, event.senderID, event.body, etc.)
 * 
 * This allows Goatbot-V2 Facebook commands to execute natively on Telegram without rewriting command files!
 */

const { InputFile } = require("grammy");
const fs = require("fs-extra");
const path = require("path");
const log = require("../logger/log.js");

/**
 * Creates stream-based InputFile for Telegram media sending
 */
function createInputFile(mediaInput) {
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
 * Creates FCA-compatible `api` object wrapping Telegram API (TCA)
 */
function createFcaApiWrapper(ctx) {
        const botApi = ctx.api;

        return {
                /**
                 * api.sendMessage(msg, threadID, callback, messageID)
                 * Supports text strings, body/attachment objects, streams, and reply targets.
                 */
                sendMessage: async function (msg, threadID, callback, replyToMessageID) {
                        const targetThread = (threadID || ctx.chat?.id)?.toString();
                        let cb = typeof callback === "function" ? callback : (typeof replyToMessageID === "function" ? replyToMessageID : null);
                        let replyId = typeof replyToMessageID === "number" || typeof replyToMessageID === "string" ? replyToMessageID : undefined;

                        try {
                                let sentMsgInfo = null;

                                if (typeof msg === "string" || typeof msg === "number") {
                                        const res = await botApi.sendMessage(targetThread, msg.toString(), {
                                                reply_to_message_id: replyId,
                                                parse_mode: "HTML"
                                        }).catch(() => botApi.sendMessage(targetThread, msg.toString(), { reply_to_message_id: replyId }));

                                        sentMsgInfo = {
                                                messageID: res.message_id,
                                                threadID: targetThread,
                                                timestamp: res.date * 1000
                                        };
                                } else if (typeof msg === "object" && msg !== null) {
                                        const text = msg.body || msg.text || "";
                                        const attachments = msg.attachment ? (Array.isArray(msg.attachment) ? msg.attachment : [msg.attachment]) : [];

                                        if (attachments.length > 0) {
                                                const inputFile = createInputFile(attachments[0]);
                                                const res = await botApi.sendPhoto(targetThread, inputFile, {
                                                        caption: text,
                                                        reply_to_message_id: replyId
                                                }).catch(async () => {
                                                        return await botApi.sendDocument(targetThread, inputFile, {
                                                                caption: text,
                                                                reply_to_message_id: replyId
                                                        });
                                                });
                                                sentMsgInfo = { messageID: res.message_id, threadID: targetThread, timestamp: res.date * 1000 };
                                        } else if (text) {
                                                const res = await botApi.sendMessage(targetThread, text, { reply_to_message_id: replyId });
                                                sentMsgInfo = { messageID: res.message_id, threadID: targetThread, timestamp: res.date * 1000 };
                                        }
                                }

                                if (cb) cb(null, sentMsgInfo);
                                return sentMsgInfo;
                        } catch (err) {
                                log.error("FCA_API_SEND", `Failed to send message: ${err.message}`);
                                if (cb) cb(err, null);
                                throw err;
                        }
                },

                /**
                 * api.unsendMessage(messageID, callback)
                 */
                unsendMessage: async function (messageID, callback) {
                        try {
                                const targetID = messageID || ctx.message?.message_id;
                                await botApi.deleteMessage(ctx.chat.id, targetID);
                                if (typeof callback === "function") callback(null);
                        } catch (err) {
                                if (typeof callback === "function") callback(err);
                        }
                },

                /**
                 * api.setMessageReaction(emoji, messageID, threadID, force, callback)
                 */
                setMessageReaction: async function (emoji, messageID, threadID, force, callback) {
                        try {
                                const targetMsg = messageID || ctx.message?.message_id;
                                const targetThread = threadID || ctx.chat?.id;
                                if (botApi.setMessageReaction) {
                                        await botApi.setMessageReaction(targetThread, targetMsg, [{ type: "emoji", emoji }]);
                                }
                                if (typeof callback === "function") callback(null);
                        } catch (err) {
                                if (typeof callback === "function") callback(err);
                        }
                },

                /**
                 * api.getUserInfo(userID, callback)
                 */
                getUserInfo: async function (userID, callback) {
                        try {
                                const targetUser = Array.isArray(userID) ? userID[0] : userID;
                                const chat = await botApi.getChat(targetUser);
                                const result = {
                                        [targetUser]: {
                                                name: `${chat.first_name || ""} ${chat.last_name || ""}`.trim() || chat.username || "User",
                                                firstName: chat.first_name || "",
                                                lastName: chat.last_name || "",
                                                username: chat.username || "",
                                                profileUrl: chat.username ? `https://t.me/${chat.username}` : ""
                                        }
                                };
                                if (typeof callback === "function") callback(null, result);
                                return result;
                        } catch (err) {
                                if (typeof callback === "function") callback(err, null);
                                return {};
                        }
                },

                /**
                 * api.getThreadInfo(threadID, callback)
                 */
                getThreadInfo: async function (threadID, callback) {
                        try {
                                const targetThread = threadID || ctx.chat?.id;
                                const chat = await botApi.getChat(targetThread);
                                const result = {
                                        threadID: chat.id.toString(),
                                        threadName: chat.title || chat.first_name || "Chat",
                                        isGroup: chat.type === "group" || chat.type === "supergroup",
                                        userInfo: []
                                };
                                if (typeof callback === "function") callback(null, result);
                                return result;
                        } catch (err) {
                                if (typeof callback === "function") callback(err, null);
                                return {};
                        }
                },

                /**
                 * api.getCurrentUserID()
                 */
                getCurrentUserID: function () {
                        return (global.GoatBot.botID || ctx.me?.id)?.toString();
                },

                /**
                 * api.kickParticipant(userID, threadID, callback)
                 */
                kickParticipant: async function (userID, threadID, callback) {
                        try {
                                const targetThread = threadID || ctx.chat?.id;
                                await botApi.banChatMember(targetThread, userID);
                                await botApi.unbanChatMember(targetThread, userID); // unban so user can rejoin if invited
                                if (typeof callback === "function") callback(null);
                        } catch (err) {
                                if (typeof callback === "function") callback(err);
                        }
                }
        };
}

/**
 * Creates FCA-compatible `event` object from Telegram update context
 */
function createFcaEventObject(ctx) {
        const msg = ctx.message || ctx.editedMessage || {};
        const from = ctx.from || msg.from || {};
        const chat = ctx.chat || msg.chat || {};

        const event = {
                type: msg.reply_to_message ? "message_reply" : "message",
                threadID: chat.id?.toString() || "",
                senderID: from.id?.toString() || "",
                body: msg.text || msg.caption || "",
                messageID: msg.message_id,
                isGroup: chat.type === "group" || chat.type === "supergroup",
                attachments: [],
                telegramCtx: ctx
        };

        // Map Telegram attachments
        if (msg.photo) {
                const largestPhoto = msg.photo[msg.photo.length - 1];
                event.attachments.push({
                        type: "photo",
                        url: largestPhoto.file_id,
                        file_id: largestPhoto.file_id
                });
        } else if (msg.document) {
                event.attachments.push({
                        type: "file",
                        url: msg.document.file_id,
                        filename: msg.document.file_name
                });
        }

        // Map reply_to_message
        if (msg.reply_to_message) {
                const replyMsg = msg.reply_to_message;
                event.messageReply = {
                        messageID: replyMsg.message_id,
                        senderID: replyMsg.from?.id?.toString() || "",
                        body: replyMsg.text || replyMsg.caption || "",
                        attachments: replyMsg.photo ? [{ type: "photo", file_id: replyMsg.photo[replyMsg.photo.length - 1].file_id }] : []
                };
        }

        return event;
}

module.exports = { createFcaApiWrapper, createFcaEventObject, createInputFile };
