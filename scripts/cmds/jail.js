const axios = require("axios");

module.exports = {
  config: {
    name: "jail",
    aliases: ["prison", "behindbars"],
    version: "2.0.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Create jail effect photo"
    },
    longDescription: {
      en: "Generate a jail effect image for yourself, a mentioned user, or a replied photo/user avatar using Toshiro Canvas Jail API"
    },
    category: "canvas",
    guide: {
      en: "{pn} (self avatar)\n{pn} @mention\n{pn} (reply to user or image)"
    }
  },

  onStart: async function ({ api, event, message, args }) {
    const imageUrl = await global.utils.extractImageUrl(args, event, api);

    if (!imageUrl) {
      return message.reply("⛓️ Please provide an image URL, reply to an image/user, or mention someone.");
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("⛓️", event.messageID, () => {}, true);
    }

    try {
      const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/canvas/jail?image=${encodeURIComponent(imageUrl)}`;
      const stream = await global.utils.getStreamFromURL(apiUrl, "jail.png");

      await message.reply({
        body: "⛓️ Behind bars! You've been put in jail! 🚓",
        attachment: stream
      });

      if (api.setMessageReaction) {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }
    } catch (error) {
      console.error("Jail command error:", error);
      if (api.setMessageReaction) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to generate jail image: ${error.message || error}`);
    }
  }
};
