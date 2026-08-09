/**
 * @author NTKhang & Modded for Telegram by frnAlt & Gtajisan
 * ! GoatBot V2 Telegram Entry Point
 */

const { spawn } = require("child_process");
const log = require("./logger/log.js");

// Handle top-level process stability for index launcher
process.on("unhandledRejection", (error) => {
        log.error("INDEX_UNHANDLED_REJECTION", error?.message || error);
});

process.on("uncaughtException", (error) => {
        log.error("INDEX_UNCAUGHT_EXCEPTION", error?.message || error);
});

function startProject() {
        // Run Goat.js with memory management flags for tight free-tier hosting (Render/Railway 512MB limits)
        // --expose-gc : allows MemoryManager inside Goat.js to invoke global.gc()
        // --max-old-space-size=400 : keeps Node heap below 400MB to avoid OOM kills
        const child = spawn("node", ["--expose-gc", "--max-old-space-size=400", "Goat.js"], {
                cwd: __dirname,
                stdio: "inherit",
                shell: true
        });

        child.on("close", (code) => {
                log.info("PROCESS", `GoatBot process exited with code: ${code}`);
                if (code === 0) {
                        log.info("PROCESS", "Bot stopped cleanly. Exit without restart.");
                        return;
                }
                const delay = code === 2 ? 0 : 3000;
                log.info("PROCESS", `Restarting bot process in ${delay / 1000}s...`);
                setTimeout(() => startProject(), delay);
        });
}

startProject();
