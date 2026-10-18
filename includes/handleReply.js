/**
 * System Listener: handleReply
 * Handles reply listeners (`onReply`) when users reply to bot messages
 */

const log = require("../logger/log.js");

const OutputClass = require("../func/outputClass.js");

module.exports = async function handleReply({ api, event, message, role, input, output, threadsDB, usersDB, globalDB, getLang }) {
        const { GoatBot, db } = global;
        if (!event.messageReply) return;

        const replyMsgID = event.messageReply.messageID;
        const replyData = GoatBot.onReply.get(replyMsgID);

        if (!replyData) return;

        const { commandName } = replyData;
        const command = GoatBot.commands.get(commandName);

        if (!command || typeof command.onReply !== "function") return;

        const tDB = threadsDB || db?.threadsData;
        const uDB = usersDB || db?.usersData;
        const gDB = globalDB || db?.globalData;
        const safeOutput = output || new OutputClass({ api, event, message });
        const safeInput = input || {
                body: event.body || "",
                args: (event.body || "").trim().split(/\s+/),
                arguments: (event.body || "").trim().split(/\s+/),
                senderID: event.senderID,
                threadID: event.threadID,
                messageID: event.messageID,
                sid: event.senderID,
                tid: event.threadID,
                type: event.type || "message_reply",
                isFacebook: false,
                isTelegram: true,
                isAdmin: role >= 2,
                isDev: role >= 4,
                role,
                ...event
        };

        try {
                const langFunc = getLang || ((key, ...args) => global.utils.getText(command, key, ...args));
                await command.onReply({
                        api,
                        event,
                        message,
                        input: safeInput,
                        output: safeOutput,
                        args: event.body.trim().split(/\s+/),
                        Reply: replyData,
                        replyData,
                        role,
                        commandName,
                        getLang: langFunc,
                        threadsData: tDB,
                        usersData: uDB,
                        dashBoardData: db?.dashBoardData,
                        globalData: gDB,
                        threadsDB: tDB,
                        usersDB: uDB,
                        globalDB: gDB
                });
        } catch (err) {
                log.error("HANDLE_REPLY", `Error executing onReply for command ${commandName}: ${err.stack || err.message}`);
        }
};
