/**
 * System Listener: handleReaction
 * Handles reaction listeners (`onReaction`) when users react to bot messages
 */

const log = require("../logger/log.js");

const OutputClass = require("../func/outputClass.js");

module.exports = async function handleReaction({ api, event, message, role, input, output, threadsDB, usersDB, globalDB, getLang }) {
        const { GoatBot, db } = global;
        if (event.type !== "message_reaction") return;

        const reactionMsgID = event.messageID;
        const reactionData = GoatBot.onReaction.get(reactionMsgID);

        if (!reactionData) return;

        const { commandName } = reactionData;
        const command = GoatBot.commands.get(commandName);

        if (!command || typeof command.onReaction !== "function") return;

        const tDB = threadsDB || db?.threadsData;
        const uDB = usersDB || db?.usersData;
        const gDB = globalDB || db?.globalData;
        const safeOutput = output || new OutputClass({ api, event, message });
        const safeInput = input || {
                body: event.body || "",
                args: [],
                arguments: [],
                senderID: event.userID || event.senderID,
                threadID: event.threadID,
                messageID: event.messageID,
                reaction: event.reaction,
                sid: event.userID || event.senderID,
                tid: event.threadID,
                type: "message_reaction",
                isFacebook: false,
                isTelegram: true,
                isAdmin: role >= 2,
                isDev: role >= 4,
                role,
                ...event
        };

        try {
                const langFunc = getLang || ((key, ...args) => global.utils.getText(command, key, ...args));
                await command.onReaction({
                        api,
                        event,
                        message,
                        input: safeInput,
                        output: safeOutput,
                        Reaction: reactionData,
                        reactionData,
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
                log.error("HANDLE_REACTION", `Error executing onReaction for command ${commandName}: ${err.stack || err.message}`);
        }
};
