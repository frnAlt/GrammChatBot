/**
 * System Listener: handleEvent
 * Handles system events (join, leave, chat update events)
 */

const log = require("../logger/log.js");

module.exports = async function handleEvent({ api, event, message, role }) {
        const { GoatBot, db } = global;

        for (const eventCmdName of GoatBot.onEvent) {
                const eventCmd = GoatBot.eventCommands.get(eventCmdName) || GoatBot.commands.get(eventCmdName);
                if (eventCmd && typeof eventCmd.onEvent === "function") {
                        try {
                                await eventCmd.onEvent({
                                        api,
                                        event,
                                        message,
                                        role,
                                        threadsData: db.threadsData,
                                        usersData: db.usersData,
                                        dashBoardData: db.dashBoardData,
                                        globalData: db.globalData
                                });
                        } catch (err) {
                                log.error("HANDLE_EVENT", `Error executing onEvent (${eventCmdName}): ${err.message}`);
                        }
                }
        }
};
