/**
 * GoatBot V2 Script Loader
 * Dynamically loads and validates commands and event handlers from /scripts/cmds and /scripts/events (or /commands)
 */

const { readdirSync, readFileSync, existsSync } = require("fs-extra");
const path = require("path");
const log = require("../../logger/log.js");

const regExpCheckPackage = /require\s*\(\s*[`'"]([^`'"]+)[`'"]\s*\)/g;
const packageAlready = [];

module.exports = async function loadScripts(db) {
        const { GoatBot, utils } = global;
        const { configCommands } = GoatBot;

        const folders = [
                { name: "cmds", dir: path.normalize(process.cwd() + "/scripts/cmds"), map: "commands", text: "command" },
                { name: "commands", dir: path.normalize(process.cwd() + "/commands"), map: "commands", text: "command" },
                { name: "events", dir: path.normalize(process.cwd() + "/scripts/events"), map: "eventCommands", text: "event command" }
        ];

        for (const target of folders) {
                if (!existsSync(target.dir)) continue;

                const files = readdirSync(target.dir).filter(file =>
                        file.endsWith(".js") &&
                        !file.endsWith(".eg.js") && // ignore example files
                        !configCommands[target.name === "events" ? "commandEventUnload" : "commandUnload"]?.includes(file)
                );

                log.info("LOAD_SCRIPTS", `Loading ${files.length} script(s) from /${path.relative(process.cwd(), target.dir)}...`);

                let loadedCount = 0;
                const errors = [];

                for (const file of files) {
                        const pathCommand = path.join(target.dir, file);
                        try {
                                // Package installation check
                                const contentFile = readFileSync(pathCommand, "utf8");
                                let matches = [...contentFile.matchAll(regExpCheckPackage)];
                                for (const match of matches) {
                                        let packageName = match[1];
                                        if (!packageName.startsWith(".") && !packageName.startsWith("/") && !packageName.startsWith(__dirname)) {
                                                if (packageName.startsWith("@")) packageName = packageName.split("/").slice(0, 2).join("/");
                                                else packageName = packageName.split("/")[0];

                                                if (!packageAlready.includes(packageName)) {
                                                        packageAlready.push(packageName);
                                                }
                                        }
                                }

                                // Clear cache to allow hot reload
                                delete require.cache[require.resolve(pathCommand)];
                                const command = require(pathCommand);
                                command.location = pathCommand;

                                const configCommand = command.config;
                                if (!configCommand) throw new Error("Command 'config' object is undefined");
                                if (!configCommand.name) throw new Error("Command 'config.name' is undefined");
                                if (!configCommand.category) throw new Error("Command 'config.category' is undefined");
                                if (!command.onStart) throw new Error("Command 'onStart' function is undefined");
                                if (typeof command.onStart !== "function") throw new Error("'onStart' must be a function");

                                const commandName = configCommand.name.toLowerCase();

                                // Check duplicate command name
                                if (GoatBot[target.map].has(commandName)) {
                                        // Overwrite or log duplicate
                                        log.warn("LOAD_SCRIPTS", `Overwriting duplicate command: ${commandName}`);
                                }

                                // Check & Register Aliases
                                if (Array.isArray(configCommand.aliases)) {
                                        for (const alias of configCommand.aliases) {
                                                const lowerAlias = alias.toLowerCase();
                                                GoatBot.aliases.set(lowerAlias, commandName);
                                        }
                                }

                                // Handle onLoad hook if defined
                                if (typeof command.onLoad === "function") {
                                        try {
                                                await command.onLoad({ bot: GoatBot, db });
                                        } catch (e) {
                                                log.warn("ON_LOAD", `Error in onLoad of ${commandName}: ${e.message}`);
                                        }
                                }

                                // Register onChat listener
                                if (typeof command.onChat === "function" && !GoatBot.onChat.includes(commandName)) {
                                        GoatBot.onChat.push(commandName);
                                }

                                // Register onEvent listener
                                if (typeof command.onEvent === "function" && !GoatBot.onEvent.includes(commandName)) {
                                        GoatBot.onEvent.push(commandName);
                                }

                                GoatBot[target.map].set(commandName, command);
                                loadedCount++;

                        } catch (err) {
                                errors.push({ file, error: err.message });
                        }
                }

                log.success("LOAD_SCRIPTS", `Successfully loaded ${loadedCount} ${target.text}(s) from /${path.relative(process.cwd(), target.dir)}.`);
                if (errors.length > 0) {
                        for (const err of errors) {
                                log.error("LOAD_SCRIPTS", `Failed to load ${err.file}: ${err.error}`);
                        }
                }
        }
};
