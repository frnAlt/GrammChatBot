/**
 * TokenManager for Telegram Bot API
 * Handles multi-account token rotation, 429 rate limit fallback, active session management, and developer notification.
 */

const { Bot } = require("grammy");
const log = require("../../logger/log.js");

class TokenManager {
        constructor() {
                this.tokens = [];
                this.currentIndex = 0;
                this.activeBot = null;
                this.isPolling = false;
                this.rotationHistory = [];
                this.botInfo = null;
        }

        init(tokens = []) {
		let envTokens = [];
		if (process.env.TELEGRAM_TOKENS) {
			try {
				envTokens = JSON.parse(process.env.TELEGRAM_TOKENS);
			} catch (e) {
				envTokens = process.env.TELEGRAM_TOKENS.split(",").map(t => t.trim());
			}
		} else if (process.env.TELEGRAM_TOKEN) {
			envTokens = [process.env.TELEGRAM_TOKEN.trim()];
		}

		const combined = [...envTokens, ...(Array.isArray(tokens) ? tokens : [])];
		// Filter out empty placeholder tokens
		this.tokens = combined.filter(t => t && typeof t === "string" && !t.includes("YOUR_TELEGRAM_BOT_TOKEN"));
		if (this.tokens.length === 0) {
			log.warn("TOKEN_MANAGER", "No valid Telegram bot tokens configured in config.json or process.env. Please add actual Bot tokens!");
			this.tokens = combined.length > 0 ? combined : tokens;
		}
		this.currentIndex = 0;
		log.info("TOKEN_MANAGER", `Initialized with ${this.tokens.length} token(s).`);
	}

        getCurrentToken() {
                return this.tokens[this.currentIndex] || "";
        }

        async notifyDeveloper(messageText) {
                const devUsers = global.GoatBot?.config?.devUsers || [];
                if (!devUsers || devUsers.length === 0) return;

                for (const devId of devUsers) {
                        if (!devId || devId === "123456789") continue;
                        try {
                                if (this.activeBot?.api) {
                                        await this.activeBot.api.sendMessage(devId, messageText);
                                }
                        } catch (e) {
                                log.warn("NOTIFY_DEV", `Could not send failover notification to Developer ${devId}: ${e.message}`);
                        }
                }
        }

        async createBotInstance(handlerCallback) {
                const token = this.getCurrentToken();
                if (!token || token.includes("YOUR_TELEGRAM_BOT_TOKEN")) {
                        log.error("TOKEN_MANAGER", `Invalid token at index ${this.currentIndex}. Please update config.json with actual Bot tokens.`);
                        return null;
                }

                const bot = new Bot(token);

                // Attach top-level grammY error handling to trigger token rotation on 429 errors or bans
                bot.catch(async (err) => {
                        const ctx = err.ctx;
                        const error = err.error;
                        log.error("GRAMMY_ERROR", `Error handling update ${ctx?.update?.update_id}: ${error?.message || error}`);

                        // Check for HTTP 429 Rate Limit or account block/ban
                        if (error?.error_code === 429 || error?.error_code === 401 || error?.error_code === 403 || error?.message?.includes("429") || error?.message?.includes("Too Many Requests")) {
                                log.warn("TOKEN_MANAGER", `Severe block/rate limit (429/403) hit on token index ${this.currentIndex}. Triggering automatic token rotation...`);
                                await this.rotateToken(handlerCallback, error?.message || "Rate Limit / Blocked");
                        }
                });

                if (handlerCallback) {
                        handlerCallback(bot);
                }

                this.activeBot = bot;
                try {
                        this.botInfo = await bot.api.getMe();
                        log.success("TOKEN_MANAGER", `Logged in as @${this.botInfo.username} (ID: ${this.botInfo.id}) [Token index: ${this.currentIndex}]`);
                        global.GoatBot.botID = this.botInfo.id;
                        global.GoatBot.botInfo = this.botInfo;
                } catch (e) {
                        log.error("TOKEN_MANAGER", `Failed to get bot info for token index ${this.currentIndex}: ${e.message}`);
                }

                return bot;
        }

        async rotateToken(handlerCallback, reason = "Rate Limit 429 / Error") {
                if (this.tokens.length <= 1) {
                        log.warn("TOKEN_MANAGER", "Cannot rotate tokens: Only 1 token configured.");
                        return false;
                }

                const previousIndex = this.currentIndex;
                this.currentIndex = (this.currentIndex + 1) % this.tokens.length;

                this.rotationHistory.push({
                        fromIndex: previousIndex,
                        toIndex: this.currentIndex,
                        timestamp: Date.now(),
                        reason
                });

                log.info("TOKEN_MANAGER", `Switching token from Index ${previousIndex} -> Index ${this.currentIndex}`);

                if (this.activeBot && this.isPolling) {
                        try {
                                await this.activeBot.stop();
                                this.isPolling = false;
                        } catch (e) {
                                log.warn("TOKEN_MANAGER", `Error stopping active bot instance: ${e.message}`);
                        }
                }

                const newBot = await this.createBotInstance(handlerCallback);
                if (newBot) {
                        this.startPolling(newBot);

                        // Notify Developer ID of the failover
                        await this.notifyDeveloper(`⚠️ <b>GrammChatBot Token Failover</b>\n\nActive token hit rate limit/error (${reason}).\nSwitched from Token Index #${previousIndex} to Token Index #${this.currentIndex} (@${this.botInfo?.username}).`);

                        return true;
                }
                return false;
        }

        async startPolling(botInstance = this.activeBot) {
                if (!botInstance) return;
                try {
                        this.isPolling = true;
                        botInstance.start({
                                onStart: (botInfo) => {
                                        log.success("TELEGRAM_BOT", `Bot @${botInfo.username} is now actively polling for updates.`);
                                }
                        });
                } catch (err) {
                        log.error("TELEGRAM_BOT", `Polling error: ${err.message}`);
                        this.isPolling = false;
                }
        }

        getStats() {
                return {
                        totalTokens: this.tokens.length,
                        activeTokenIndex: this.currentIndex,
                        isPolling: this.isPolling,
                        botInfo: this.botInfo || { username: "Not Logged In", id: null },
                        rotationCount: this.rotationHistory.length,
                        rotationHistory: this.rotationHistory.slice(-5)
                };
        }
}

module.exports = new TokenManager();
