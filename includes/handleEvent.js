/**
 * System Listener: handleEvent
 * Handles system events (join, leave, chat update events)
 */

const OutputClass = require("../func/outputClass.js");
const log = require("../logger/log.js");

module.exports = async function handleEvent({ api, event, message, role, input, output, threadsDB, usersDB, globalDB }) {
        const { GoatBot, db } = global;

        const tDB = threadsDB || db?.threadsData;
        const uDB = usersDB || db?.usersData;
        const gDB = globalDB || db?.globalData;

        const safeInput = input || {
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
                isAdmin: (role >= 2),
                isDev: (role >= 4),
                role: role || 0,
                censor: (str) => String(str || ""),
                toString: () => String(event.body || ""),
                ...event
        };

        const safeOutput = output || new OutputClass({ api, event, message });

        for (const eventCmdName of GoatBot.onEvent) {
                const eventCmd = GoatBot.eventCommands.get(eventCmdName) || GoatBot.commands.get(eventCmdName);
                if (eventCmd && typeof eventCmd.onEvent === "function") {
                        try {
                                await eventCmd.onEvent({
                                        api,
                                        event,
                                        message,
                                        role,
                                        input: safeInput,
                                        output: safeOutput,
                                        threadsData: tDB,
                                        usersData: uDB,
                                        dashBoardData: db?.dashBoardData,
                                        globalData: gDB,
                                        threadsDB: tDB,
                                        usersDB: uDB,
                                        globalDB: gDB
                                });
                        } catch (err) {
                                log.error("HANDLE_EVENT", `Error executing onEvent (${eventCmdName}): ${err.message}`);
                        }
                }
        }
};
