const axios = require("axios");

module.exports = {
  config: {
    name: "hsredits",
    aliases: ["hsredit", "hsrvideo", "starrailedit"],
    version: "1.1.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Random Honkai Star Rail edits video"
    },
    longDescription: {
      en: "Fetches and sends random Honkai: Star Rail edit videos from TikTok using Toshiro TikSearch API"
    },
    category: "media",
    guide: {
      en: "{pn} [query]"
    }
  },

  onStart: async function ({ api, event, message, args, commandName }) {
    const query = args.join(" ").trim() || "Hsr edits";

    if (api.setMessageReaction) {
      api.setMessageReaction("✨", event.messageID, () => {}, true);
    }

    try {
      const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/search/tiksearch?keyword=${encodeURIComponent(query)}`;
      const res = await axios.get(apiUrl, { timeout: 30000 });

      if (!res.data || !res.data.success || !res.data.result || !res.data.result.video) {
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply("❌ No Honkai Star Rail edits found at this moment.");
      }

      const result = res.data.result;
      const stream = await global.utils.getStreamFromURL(result.video, "hsr_edit.mp4");

      await message.reply({
        body: `✨ Honkai: Star Rail Edit\n\n📌 Title: ${result.title || query}\n👤 Creator: @${result.author || "Unknown"}\n⏱️ Duration: ${result.duration || 0}s`,
        attachment: stream
      });

      if (api.setMessageReaction) {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }
    } catch (err) {
      console.error("HsrEdits error:", err);
      if (api.setMessageReaction) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to fetch Honkai Star Rail edit: ${err.message || err}`);
    }
  }
};
