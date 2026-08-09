/**
 * Express.js Web Dashboard for GoatBot V2 Telegram Edition
 * Provides real-time monitoring of Telegram Bot stats, polling status, active token sessions, and memory usage.
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
                secret: config.dashBoard?.secret || "goatbot-telegram-secret-key-12345",
                resave: false,
                saveUninitialized: false,
                store: sessionStore,
                cookie: { maxAge: 1000 * 60 * 60 * 24 }
        }));

        // Static files
        app.use("/css", express.static(path.join(__dirname, "css")));
        app.use("/js", express.static(path.join(__dirname, "js")));
        app.use("/images", express.static(path.join(__dirname, "images")));

        // Public Web Stats Page
        app.get(["/", "/stats"], (req, res) => {
                const mem = process.memoryUsage();
                const tokenStats = tokenManager ? tokenManager.getStats() : {};
                const uptimeSeconds = Math.floor((Date.now() - GoatBot.startTime) / 1000);
                const uptimeFormatted = utils.convertTime ? utils.convertTime(uptimeSeconds * 1000) : `${uptimeSeconds}s`;

                res.render("stats", {
                        botUsername: tokenStats.botInfo?.username || "Not Logged In",
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
                        uptimeSecond: uptimeSeconds
                });
        });

        // JSON API Endpoint for Telegram Bot Stats
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
                                totalTokens: tokenStats.totalTokens || 0,
                                rotationCount: tokenStats.rotationCount || 0
                        },
                        memory: {
                                heapUsedMB: parseFloat((mem.heapUsed / 1024 / 1024).toFixed(2)),
                                heapTotalMB: parseFloat((mem.heapTotal / 1024 / 1024).toFixed(2)),
                                rssMB: parseFloat((mem.rss / 1024 / 1024).toFixed(2))
                        },
                        bot: {
                                loadedCommands: GoatBot.commands.size,
                                loadedEvents: GoatBot.eventCommands.size,
                                uptimeSeconds: Math.floor((Date.now() - GoatBot.startTime) / 1000)
                        }
                });
        });

        // Health Check Endpoint
        app.get("/health", (req, res) => {
                res.status(200).json({ status: "ok", polling: tokenManager?.isPolling || false, uptime: process.uptime() });
        });

        const PORT = process.env.PORT || config.dashBoard?.port || 5000;
        await server.listen(PORT);
        utils.log.info("DASHBOARD", `Express Web Dashboard running at http://localhost:${PORT}`);
};
