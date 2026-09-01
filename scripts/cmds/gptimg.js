const axios = require("axios");

module.exports = {
  config: {
    name: "gptimg",
    aliases: ["gptimage", "aiimage", "genimg", "gptimg2"],
    version: "1.0.0",
    author: "frnAlt",
    countDown: 8,
    role: 0,
    shortDescription: {
      en: "Generate AI image using GPT Image model"
    },
    longDescription: {
      en: "Generates high quality images from text prompt using Toshiro GPT Image Generation API"
    },
    category: "ai",
    guide: {
      en: "{pn} <your prompt>\n\nExample: {pn} cute fluffy cat astronaut on Mars"
    }
  },

  onStart: async function ({ api, event, message, args, commandName }) {
    const prompt = args.join(" ").trim();
    if (!prompt) {
      const prefix = global.GoatBot?.config?.prefix || "/";
      return message.reply(
        `❌ Please provide an image prompt.\n\n💡 Example: ${prefix}${commandName} cyberpunk futuristic city at night in 8k`
      );
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("🎨", event.messageID, () => {}, true);
    }

    try {
      const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/ai/gptimg?prompt=${encodeURIComponent(prompt)}`;
      const res = await axios.get(apiUrl, { timeout: 60000 });

      if (!res.data || !res.data.success || !res.data.result?.image) {
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply("❌ Failed to generate image from GPTImg API. Please try a different prompt.");
      }

      const stream = await global.utils.getStreamFromURL(res.data.result.image, "gptimg.jpg");

      await message.reply({
        body: `🎨 GPT Image Generated:\n\n✨ Prompt: "${prompt}"`,
        attachment: stream
      });

      if (api.setMessageReaction) {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }
    } catch (err) {
      console.error("GPTImg command error:", err);
      if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply(`❌ GPTImg generation failed: ${err.message || err}`);
    }
  }
};
