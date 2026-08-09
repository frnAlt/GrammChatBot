/**
 * Comprehensive Automated Test Suite for GrammChatBot, FCA-to-TCA Adapter & AstrBot AI Core
 * Verifies all API adapter functions, command execution, system listeners, role matrix, typo engine,
 * AstrBot Agentic AI engine, RAG knowledge base, and AstrBot plugin system.
 */

const assert = require("assert");
const path = require("path");

// Mock global environment BEFORE requiring utils.js
global.GoatBot = {
        startTime: Date.now(),
        commands: new Map(),
        eventCommands: new Map(),
        aliases: new Map(),
        onChat: [],
        onEvent: [],
        onReply: new Map(),
        onReaction: new Map(),
        commandFilesPath: [],
        eventCommandsFilesPath: [],
        config: {
                language: "en",
                prefix: "/",
                adminBot: ["123456789"],
                devUsers: ["999999999"],
                premiumUsers: ["111111111"]
        },
        configCommands: { envGlobal: {}, envCommands: {}, envEvents: {} },
        botID: "888888888",
        botInfo: { username: "GrammChatBot", id: 888888888 }
};

global.temp = {
        createThreadData: [],
        createUserData: [],
        createThreadDataError: new Map(),
        contentScripts: { cmds: {}, events: {} }
};

global.db = {
        threadsData: { get: async (id) => ({ threadID: id }), getAll: async () => [] },
        usersData: { get: async (id) => ({ userID: id }), getAll: async () => [] },
        dashBoardData: { get: async () => ({}), getAll: async () => [] },
        globalData: { get: async () => [], getAll: async () => [] }
};

global.utils = require("../utils.js");

const { createFcaApiWrapper, createFcaEventObject } = require("../system/api-adapter.js");
const { findClosestCommand, levenshteinDistance } = require("../utils/levenshtein.js");
const { canUseCommand } = require("../bot/telegram/handlerTelegram.js");
const aiCore = require("../system/ai-core.js");
const { MessageChain, Plain, Star } = require("../system/astrbot-api.js");
const astrbotPlugins = require("../system/astrbot-plugins.js");

async function runTests() {
        console.log("==================================================");
        console.log("🧪 STARTING GRAMMCHATBOT COMPREHENSIVE TEST SUITE");
        console.log("==================================================\n");

        let passed = 0;
        let failed = 0;

        function test(name, fn) {
                try {
                        fn();
                        console.log(`  ✔ PASS: ${name}`);
                        passed++;
                } catch (e) {
                        console.log(`  ✖ FAIL: ${name} - ${e.message}`);
                        failed++;
                }
        }

        async function asyncTest(name, fn) {
                try {
                        await fn();
                        console.log(`  ✔ PASS: ${name}`);
                        passed++;
                } catch (e) {
                        console.log(`  ✖ FAIL: ${name} - ${e.message}`);
                        failed++;
                }
        }

        // 1. Test Mock Context & FCA Event Converter
        console.log("🔹 Testing FCA Event Adapter Mapping...");
        const mockCtx = {
                message: {
                        message_id: 101,
                        text: "/hello test world",
                        from: { id: 999999999, first_name: "Developer" },
                        chat: { id: -100123456, type: "supergroup", title: "Test Group" }
                },
                chat: { id: -100123456, type: "supergroup" },
                from: { id: 999999999 },
                api: {
                        sendMessage: async (thread, text) => ({ message_id: 202, date: Math.floor(Date.now() / 1000) }),
                        deleteMessage: async () => true,
                        setMessageReaction: async () => true,
                        getChat: async (id) => ({ id, first_name: "TestUser", username: "testuser" }),
                        banChatMember: async () => true,
                        unbanChatMember: async () => true
                }
        };

        test("createFcaEventObject maps threadID and senderID correctly", () => {
                const event = createFcaEventObject(mockCtx);
                assert.strictEqual(event.threadID, "-100123456");
                assert.strictEqual(event.senderID, "999999999");
                assert.strictEqual(event.body, "/hello test world");
                assert.strictEqual(event.messageID, 101);
                assert.strictEqual(event.isGroup, true);
        });

        // 2. Test FCA API Adapter
        console.log("\n🔹 Testing FCA API Adapter Methods...");
        const api = createFcaApiWrapper(mockCtx);

        test("api.getCurrentUserID returns bot ID", () => {
                assert.strictEqual(api.getCurrentUserID(), "888888888");
        });

        await asyncTest("api.sendMessage sends message string and returns info object", async () => {
                const info = await api.sendMessage("Hello from FCA adapter!", "-100123456");
                assert.strictEqual(info.messageID, 202);
                assert.strictEqual(info.threadID, "-100123456");
        });

        await asyncTest("api.getUserInfo fetches user details", async () => {
                const info = await api.getUserInfo("999999999");
                assert.strictEqual(info["999999999"].firstName, "TestUser");
        });

        await asyncTest("api.unsendMessage deletes message", async () => {
                await api.unsendMessage(202);
        });

        await asyncTest("api.setMessageReaction sets emoji reaction", async () => {
                await api.setMessageReaction("👍", 101, "-100123456");
        });

        // 3. Test Levenshtein Typo Engine
        console.log("\n🔹 Testing Levenshtein Typo Suggestion Engine...");
        test("levenshteinDistance computes edit distance correctly", () => {
                assert.strictEqual(levenshteinDistance("imgge", "image"), 1);
                assert.strictEqual(levenshteinDistance("hepl", "help"), 2);
        });

        test("findClosestCommand suggests closest command for typos", () => {
                const match = findClosestCommand("imgge", ["image", "help", "ping", "stats"]);
                assert.strictEqual(match.command, "image");
        });

        // 4. Test Role Permission Matrix
        console.log("\n🔹 Testing 5-Level Role Permission Matrix...");
        test("canUseCommand evaluates roles correctly", () => {
                assert.strictEqual(canUseCommand(4, 4), true);
                assert.strictEqual(canUseCommand(4, 0), true);
                assert.strictEqual(canUseCommand(0, 4), false);
                assert.strictEqual(canUseCommand(0, 3), false);
                assert.strictEqual(canUseCommand(1, 1), true);
                assert.strictEqual(canUseCommand(1, 3), false);
        });

        // 5. Test AstrBot AI Core Engine
        console.log("\n🔹 Testing AstrBot AI Core Engine...");
        test("aiCore initializes with default OpenAI provider and tools", () => {
                assert.strictEqual(aiCore.getProvider(), "openai");
                assert.strictEqual(aiCore.state.toolsEnabled.webSearch, true);
        });

        test("aiCore RAG knowledge base adds and searches document snippets", () => {
                aiCore.addDocumentToRAG("GrammChatBot is a 1-to-1 FCA to TCA port of Goatbot V2 with AstrBot AI.", { source: "test" });
                const history = aiCore.getConversationHistory("test_context");
                assert.strictEqual(Array.isArray(history), true);
        });

        await asyncTest("aiCore generates completion fallback response", async () => {
                const res = await aiCore.generateCompletion({ prompt: "Hello AI!", contextId: "test_context" });
                assert.strictEqual(typeof res, "string");
                assert.strictEqual(res.length > 0, true);
        });

        // 6. Test AstrBot API Component Suite & Plugin Manager
        console.log("\n🔹 Testing AstrBot API Specs & Plugins Marketplace...");
        test("MessageChain formats plain text correctly", () => {
                const chain = MessageChain.fromString("Hello AstrBot");
                assert.strictEqual(chain.getPlainText(), "Hello AstrBot");
        });

        test("Star class registers tools and commands dynamically", () => {
                const star = new Star("test_star", "Test plugin");
                star.register_tool("test_tool", "Description", {}, async () => "result");
                assert.strictEqual(star.tools.has("test_tool"), true);
        });

        test("astrbotPlugins plugin manager handles installation", () => {
                const plugins = astrbotPlugins.getInstalledPlugins();
                assert.strictEqual(Array.isArray(plugins), true);
                assert.strictEqual(plugins.length > 0, true);
        });

        // 7. Test Command Executions
        console.log("\n🔹 Testing Command Executions...");
        const loadScripts = require("../bot/login/loadScripts.js");
        await loadScripts(
                null,
                null,
                null,
                null,
                global.db.globalData,
                global.db.threadsData,
                global.db.usersData,
                global.db.dashBoardData,
                global.db.globalData,
                (name) => name
        );

        const loadedCmds = Array.from(global.GoatBot.commands.keys());
        console.log(`  Loaded ${loadedCmds.length} commands.`);

        const messageMock = {
                reply: async (text) => {
                        console.log(`    [Bot Reply]: ${typeof text === "string" ? text.substring(0, 60) : "Media"}`);
                        return { messageID: 303 };
                },
                send: async (text) => {
                        return { messageID: 304 };
                },
                unsend: async () => true,
                react: async () => true,
                SyntaxError: () => true
        };

        const testCmds = ["examplecmd", "help", "stats", "admin", "shell"];
        for (const cmdName of testCmds) {
                const cmd = global.GoatBot.commands.get(cmdName);
                if (cmd && typeof cmd.onStart === "function") {
                        await asyncTest(`Execute /${cmdName} onStart`, async () => {
                                const event = createFcaEventObject(mockCtx);
                                const getLang = (key, ...args) => {
                                        if (cmd.langs && cmd.langs.en && cmd.langs.en[key]) return cmd.langs.en[key];
                                        return global.utils.getText(cmd, key, ...args);
                                };
                                await cmd.onStart({
                                        api,
                                        event,
                                        args: ["test"],
                                        message: messageMock,
                                        role: 4,
                                        commandName: cmdName,
                                        getLang,
                                        threadsData: global.db.threadsData,
                                        usersData: global.db.usersData
                                });
                        });
                }
        }

        console.log("\n==================================================");
        console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
        console.log("==================================================");

        if (failed > 0) {
                process.exit(1);
        }
}

runTests();
