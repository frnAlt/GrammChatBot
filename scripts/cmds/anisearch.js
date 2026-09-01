const axios = require("axios");

async function fetchTikTokVideo(query) {
  try {
    const response = await axios.get(
      `https://toshiro-api-editz6t9.vercel.app/api/search/tiksearch?keyword=${encodeURIComponent(query)}`,
      { timeout: 25000 }
    );
    if (response.data && response.data.success && response.data.result) {
      return response.data.result;
    }
    return null;
  } catch (error) {
    console.error("Anisearch API Error:", error.message || error);
    return null;
  }
}

module.exports = {
  config: {
    name: "anisearch",
    aliases: ["aniedit", "animeedit"],
    author: "frnAlt",
    version: "1.1.0",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Get anime edit video"
    },
    longDescription: {
      en: "Search for anime edit videos from TikTok using Toshiro TikSearch API"
    },
    category: "media",
    guide: {
      en: "{pn} <anime name or query>"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const query = args.join(" ").trim();
    if (!query) {
      return message.reply("❌ Please provide an anime name or query.");
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("✨", event.messageID, () => {}, true);
    }

    try {
      const modifiedQuery = `${query} anime edit`;
      const result = await fetchTikTokVideo(modifiedQuery);

      if (!result || !result.video) {
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply(`❌ No anime edits found for "${query}".`);
      }

      const videoStream = await global.utils.getStreamFromURL(result.video, "anime_edit.mp4");

      await message.reply({
        body: `🎬 Anime Edit: ${result.title || query}\n👤 Creator: @${result.author || "Unknown"}\n⏱️ Duration: ${result.duration || 0}s`,
        attachment: videoStream
      });

      if (api.setMessageReaction) {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }
    } catch (error) {
      console.error("Anisearch error:", error);
      if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
      message.reply(`❌ An error occurred while processing the video: ${error.message || error}`);
    }
  }
};
