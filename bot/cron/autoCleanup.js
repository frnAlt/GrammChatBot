/**
 * Auto-Cleanup Cron Job
 * Clears /cache folders and temporary files every 30 minutes to prevent storage bloat on hosting platforms.
 */

const cron = require("node-cron");
const fs = require("fs-extra");
const path = require("path");
const log = require("../../logger/log.js");

function cleanDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) return 0;

        let removedCount = 0;
        try {
                const files = fs.readdirSync(dirPath);
                const now = Date.now();
                const maxAge = 30 * 60 * 1000; // 30 minutes

                for (const file of files) {
                        if (file === ".gitkeep" || file === "README.md") continue;
                        const filePath = path.join(dirPath, file);
                        try {
                                const stat = fs.statSync(filePath);
                                if (stat.isDirectory()) {
                                        cleanDirectory(filePath);
                                } else {
                                        // Delete if file older than 30 mins or if forced cleanup
                                        if (now - stat.mtimeMs > maxAge) {
                                                fs.unlinkSync(filePath);
                                                removedCount++;
                                        }
                                }
                        } catch (err) {
                                // file busy or deleted
                        }
                }
        } catch (e) {
                log.warn("AUTO_CLEANUP", `Failed cleaning directory ${dirPath}: ${e.message}`);
        }
        return removedCount;
}

function initAutoCleanup(config) {
        const cleanupConfig = config.autoCleanup || {};
        if (cleanupConfig.enable === false) {
                log.info("AUTO_CLEANUP", "Auto-cleanup cron job is disabled in config.");
                return;
        }

        const expression = cleanupConfig.cronExpression || "*/30 * * * *"; // default: every 30 minutes
        const targetDirs = cleanupConfig.targetDirs || [
                "./cache",
                "./scripts/cmds/cache",
                "./scripts/events/cache",
                "./tmp"
        ];

        // Ensure directories exist
        targetDirs.forEach(dir => {
                const absolute = path.resolve(process.cwd(), dir);
                fs.ensureDirSync(absolute);
        });

        cron.schedule(expression, () => {
                log.info("AUTO_CLEANUP", "Running scheduled 30-minute storage cleanup...");
                let totalCleaned = 0;

                targetDirs.forEach(dir => {
                        const absolute = path.resolve(process.cwd(), dir);
                        totalCleaned += cleanDirectory(absolute);
                });

                log.success("AUTO_CLEANUP", `Completed cache cleanup. Removed ${totalCleaned} temporary files.`);
        });

        log.info("AUTO_CLEANUP", `Scheduled 30-min auto-cleanup cron task (${expression}).`);
}

module.exports = { initAutoCleanup, cleanDirectory };
