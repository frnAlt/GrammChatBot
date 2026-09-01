const axios = require("axios");

module.exports = {
  config: {
    name: "wanted",
    aliases: ["bounty", "want"],
    version: "1.1.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Create a Wanted bounty poster"
    },
    longDescription: {
      en: "Create a One Piece / Wild West style Wanted poster for yourself, a mentioned user, or a replied photo/user avatar"
    },
    category: "canvas",
    guide: {
      en: "{pn} (self avatar)\n{pn} @mention\n{pn} (reply to user or image)"
    }
  },

  onStart: async function ({ api, event, message, args }) {
    const imageUrl = await global.utils.extractImageUrl(args, event, api);

    if (!imageUrl) {
      return message.reply("🎯 Please reply to an image/user, mention someone, or provide an image URL.");
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("🎯", event.messageID, () => {}, true);
    }

    try {
      const bounty = Math.floor(100000 + Math.random() * 900000);
      const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/canvas/wanted?image=${encodeURIComponent(imageUrl)}&currency=${bounty}`;
      const stream = await global.utils.getStreamFromURL(apiUrl, "wanted.png");

      await message.reply({
        body: `☠️ WANTED DEAD OR ALIVE! 🎯\n💰 Bounty Reward: $${bounty.toLocaleString()}`,
        attachment: stream
      });

      if (api.setMessageReaction) {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }
    } catch (error) {
      console.error("Wanted command error:", error);
      if (api.setMessageReaction) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to generate wanted poster: ${error.message || error}`);
    }
  }
};
