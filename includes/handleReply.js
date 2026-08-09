/**
 * System Listener: handleReply
 * Handles reply listeners (`onReply`) when users reply to bot messages
 */

const log = require("../logger/log.js");

module.exports = async function handleReply({ api, event, message, role, getLang }) {
        const { GoatBot, db } = global;
        if (!event.messageReply) return;

        const replyMsgID = event.messageReply.messageID;
        const replyData = GoatBot.onReply.get(replyMsgID);

        if (!replyData) return;

        const { commandName } = replyData;
        const command = GoatBot.commands.get(commandName);

        if (!command || typeof command.onReply !== "function") return;

        try {
                const langFunc = getLang || ((key, ...args) => global.utils.getText(command, key, ...args));
                await command.onReply({
                        api,
                        event,
                        message,
                        args: event.body.trim().split(/\s+/),
                        Reply: replyData,
                        replyData,
                        role,
                        commandName,
                        getLang: langFunc,
                        threadsData: db.threadsData,
                        usersData: db.usersData,
                        dashBoardData: db.dashBoardData,
                        globalData: db.globalData
                });
        } catch (err) {
                log.error("HANDLE_REPLY", `Error executing onReply for command ${commandName}: ${err.stack || err.message}`);
        }
};
