/**
 * Express.js Web Dashboard for GrammChatBot
 * Includes Real-Time Stats Panel, FCA-to-TCA status, and AstrBot AI & Plugin Collection Management APIs
 */

const express = require("express");
const app = express();
const fileUpload = require("express-fileupload");
const rateLimit = require("express-rate-limit");
const fs = require("fs-extra");
const session = require("express-session");
const eta = require("eta");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const http = require("http");
const path = require("path");

const aiCore = require("../system/ai-core.js");
const astrbotApi = require("../system/astrbot-api.js");
const astrbotPlugins = require("../system/astrbot-plugins.js");
const server = http.createServer(app);

module.exports = async function startDashboard(tokenManager) {
        const { GoatBot, utils } = global;
        const config = GoatBot.config;

        eta.configure({ useWith: true });

        app.set("views", path.join(__dirname, "views"));
        app.engine("eta", eta.renderFile);
        app.set("view engine", "eta");

        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(cookieParser());

        const sessionStore = new session.MemoryStore();
        app.use(session({
                secret: config.dashBoard?.secret || "grammchatbot-secret-key-12345",
                resave: false,
                saveUninitialized: false,
                store: sessionStore,
                cookie: { maxAge: 1000 * 60 * 60 * 24 }
        }));

        // Static files
        app.use("/css", express.static(path.join(__dirname, "css")));
        app.use("/js", express.static(path.join(__dirname, "js")));
        app.use("/images", express.static(path.join(__dirname, "images")));

        // Main Dashboard View (index.html / stats)
        app.get(["/", "/home", "/index.html", "/stats"], (req, res) => {
                const mem = process.memoryUsage();
                const tokenStats = tokenManager ? tokenManager.getStats() : {};
                const uptimeSeconds = Math.floor((Date.now() - GoatBot.startTime) / 1000);
                const uptimeFormatted = utils.convertTime ? utils.convertTime(uptimeSeconds * 1000) : `${uptimeSeconds}s`;

                res.render("stats", {
                        botUsername: tokenStats.botInfo?.username || "GrammChatBot",
                        botId: tokenStats.botInfo?.id || "N/A",
                        pollingStatus: tokenStats.isPolling ? "Active" : "Stopped",
                        activeTokenIndex: tokenStats.activeTokenIndex || 0,
                        totalTokens: tokenStats.totalTokens || 0,
                        rotationCount: tokenStats.rotationCount || 0,
                        heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
                        heapTotalMB: (mem.heapTotal / 1024 / 1024).toFixed(2),
                        rssMB: (mem.rss / 1024 / 1024).toFixed(2),
                        totalCommands: GoatBot.commands.size,
                        totalEvents: GoatBot.eventCommands.size,
                        prefix: config.prefix || "/",
                        uptime: uptimeFormatted,
                        uptimeSecond: uptimeSeconds,
                        aiState: aiCore.state,
                        installedPlugins: astrbotPlugins.getInstalledPlugins()
                });
        });

        // API Endpoint: Get Current System & AI Stats
        app.get("/api/stats", (req, res) => {
                const mem = process.memoryUsage();
                const tokenStats = tokenManager ? tokenManager.getStats() : {};
                res.json({
                        status: "success",
                        telegram: {
                                username: tokenStats.botInfo?.username || null,
                                id: tokenStats.botInfo?.id || null,
                                polling: tokenStats.isPolling || false,
                                activeTokenIndex: tokenStats.activeTokenIndex || 0,
                                totalTokens: tokenStats.totalTokens || 0
                        },
                        memory: {
                                heapUsedMB: parseFloat((mem.heapUsed / 1024 / 1024).toFixed(2)),
                                heapTotalMB: parseFloat((mem.heapTotal / 1024 / 1024).toFixed(2)),
                                rssMB: parseFloat((mem.rss / 1024 / 1024).toFixed(2))
                        },
                        ai: aiCore.state,
                        uptimeSeconds: Math.floor((Date.now() - GoatBot.startTime) / 1000)
                });
        });

        // AstrBot API Endpoint: Get Providers
        app.get("/api/astrbot/providers", (req, res) => {
                res.json({
                        status: "success",
                        activeProvider: aiCore.getProvider(),
                        model: aiCore.state.model,
                        providers: ["openai", "gemini", "claude", "deepseek", "ollama"]
                });
        });

        // AstrBot API Endpoint: Get Plugins Collection Marketplace
        app.get("/api/astrbot/plugins/marketplace", async (req, res) => {
                const marketPlugins = await astrbotPlugins.fetchMarketplacePlugins();
                const installed = astrbotPlugins.getInstalledPlugins();
                res.json({
                        status: "success",
                        installed,
                        marketplace: marketPlugins
                });
        });

        // AstrBot API Endpoint: Install Plugin from Collection
        app.post("/api/astrbot/plugins/install", (req, res) => {
                const { name, author, description, version } = req.body;
                if (!name) {
                        return res.status(400).json({ status: "error", message: "Plugin name is required." });
                }
                const result = astrbotPlugins.installPlugin({ name, author: author || "Community", description: description || "", version: version || "1.0.0" });
                res.json(result);
        });

        // AstrBot API Endpoint: Uninstall Plugin
        app.post("/api/astrbot/plugins/uninstall", (req, res) => {
                const { name } = req.body;
                if (!name) {
                        return res.status(400).json({ status: "error", message: "Plugin name is required." });
                }
                const result = astrbotPlugins.uninstallPlugin(name);
                res.json(result);
        });

        // AstrBot API Endpoint: Get Configuration
        app.get("/api/ai/config", (req, res) => {
                res.json({ status: "success", aiState: aiCore.state });
        });

        // AstrBot API Endpoint: Update AI Provider, Persona, or Tools
        app.post("/api/ai/config", (req, res) => {
                const { provider, model, systemPrompt, toolsEnabled } = req.body;

                if (provider) {
                        aiCore.setProvider(provider, model);
                }
                if (systemPrompt) {
                        aiCore.setSystemPrompt(systemPrompt);
                }
                if (toolsEnabled && typeof toolsEnabled === "object") {
                        for (const [tool, enabled] of Object.entries(toolsEnabled)) {
                                aiCore.toggleTool(tool, enabled);
                        }
                }

                res.json({
                        status: "success",
                        message: "AstrBot AI Core configuration updated successfully.",
                        aiState: aiCore.state
                });
        });

        // AstrBot API Endpoint: Add Document to RAG Knowledge Base
        app.post("/api/astrbot/rag", (req, res) => {
                const { text, metadata } = req.body;
                if (!text) {
                        return res.status(400).json({ status: "error", message: "Document text is required." });
                }
                aiCore.addDocumentToRAG(text, metadata || {});
                res.json({ status: "success", message: "Document added to Knowledge Base RAG." });
        });

        // Keep-Alive Health Endpoint
        app.get("/health", (req, res) => {
                res.status(200).json({ status: "ok", polling: tokenManager?.isPolling || false, uptime: process.uptime() });
        });

        const PORT = process.env.PORT || config.dashBoard?.port || 5000;
        await server.listen(PORT);
        utils.log.info("DASHBOARD", `Express Web Dashboard & AstrBot AI Control Panel running at http://localhost:${PORT}`);
};
