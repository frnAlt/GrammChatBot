/**
 * System Listener: handleReaction
 * Handles reaction listeners (`onReaction`) when users react to bot messages
 */

const log = require("../logger/log.js");

module.exports = async function handleReaction({ api, event, message, role, getLang }) {
        const { GoatBot, db } = global;
        if (event.type !== "message_reaction") return;

        const reactionMsgID = event.messageID;
        const reactionData = GoatBot.onReaction.get(reactionMsgID);

        if (!reactionData) return;

        const { commandName } = reactionData;
        const command = GoatBot.commands.get(commandName);

        if (!command || typeof command.onReaction !== "function") return;

        try {
                const langFunc = getLang || ((key, ...args) => global.utils.getText(command, key, ...args));
                await command.onReaction({
                        api,
                        event,
                        message,
                        Reaction: reactionData,
                        reactionData,
                        role,
                        commandName,
                        getLang: langFunc,
                        threadsData: db.threadsData,
                        usersData: db.usersData,
                        dashBoardData: db.dashBoardData,
                        globalData: db.globalData
                });
        } catch (err) {
                log.error("HANDLE_REACTION", `Error executing onReaction for command ${commandName}: ${err.stack || err.message}`);
        }
};
