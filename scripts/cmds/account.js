const tokenManager = require("../../bot/telegram/tokenManager.js");

module.exports = {
	config: {
		name: "account",
		version: "1.0",
		author: "frnAlt & Gtajisan",
		countDown: 5,
		role: 2, // Bot admin only
		description: {
			en: "Manage multiple Telegram bot accounts/tokens and check status"
		},
		category: "system",
		guide: {
			en: "{pn} status - Check multi-token status\n{pn} switch - Rotate to next token"
		}
	},

	langs: {
		en: {
			statusTitle: "📊 Telegram Multi-Token Status",
			totalAccounts: "Total tokens: %1",
			currentAccount: "Current token index: %1 (@%2)",
			switchCount: "Rotation count: %1",
			switching: "🔄 Rotating to next token...",
			switchSuccess: "✅ Token rotated successfully",
			switchFailed: "❌ Failed to rotate token (single token configured)",
			noPermission: "❌ You don't have permission to use this command",
			invalidUsage: "❌ Invalid usage. Use: status or switch"
		}
	},

	onStart: async function ({ message, args, getLang }) {
		const action = args[0]?.toLowerCase();

		switch (action) {
			case "status": {
				const stats = tokenManager.getStats();
				const statusMsg = [
					getLang("statusTitle"),
					"━━━━━━━━━━━━━━━",
					getLang("totalAccounts", stats.totalTokens),
					getLang("currentAccount", stats.activeTokenIndex, stats.botInfo.username || "N/A"),
					getLang("switchCount", stats.rotationCount),
					"━━━━━━━━━━━━━━━"
				].join("\n");
				return await message.reply(statusMsg);
			}

			case "switch": {
				await message.reply(getLang("switching"));
				const success = await tokenManager.rotateToken(null, "Manual switch requested by admin");
				if (success) {
					return await message.reply(getLang("switchSuccess"));
				} else {
					return await message.reply(getLang("switchFailed"));
				}
			}

			default: {
				return await message.reply(getLang("invalidUsage"));
			}
		}
	}
};

