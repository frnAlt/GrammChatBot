const axios = require("axios");

const AVAILABLE_ACTIONS = [
  "circle", "rounded", "resize", "crop", "rotate", "flip",
  "blur", "sharpen", "grayscale", "sepia", "invert",
  "brightness", "contrast", "saturation", "hue"
];

module.exports = {
  config: {
    name: "canvas",
    aliases: ["imgcanvas", "canvasfx", "filterimg"],
    version: "1.0.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Apply image manipulations and filters using Canvas API"
    },
    longDescription: {
      en: "Apply various canvas actions and filters: circle, rounded, blur, sharpen, grayscale, sepia, invert, brightness, contrast, saturation, hue, rotate, flip, resize"
    },
    category: "image",
    guide: {
      en: "{pn} <action> [value] | Reply to an image\n\nActions:\ncircle, rounded, blur, sharpen, grayscale, sepia, invert, brightness, contrast, saturation, hue, rotate, flip\n\nExample:\n• {pn} grayscale\n• {pn} blur 10\n• {pn} circle"
    }
  },

  onStart: async function ({ api, event, message, args, commandName }) {
    const action = args[0]?.toLowerCase();
    const prefix = global.GoatBot?.config?.prefix || "/";

    if (!action || !AVAILABLE_ACTIONS.includes(action)) {
      return message.reply(
        `🎨 **Available Canvas Actions**:\n\n` +
        `• Filters: grayscale, sepia, invert, blur [val], sharpen [val]\n` +
        `• Adjustments: brightness [val], contrast [val], saturation [val], hue [val]\n` +
        `• Shapes & Transforms: circle, rounded, rotate [deg], flip [h/v], resize [w] [h]\n\n` +
        `💡 Usage: Reply to an image with:\n${prefix}${commandName} <action> [value]`
      );
    }

    const imageUrl = await global.utils.extractImageUrl(args.slice(1), event, api);
    if (!imageUrl) {
      return message.reply(
        `📸 Please reply to an image or mention a user to apply the '${action}' effect.`
      );
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("🎨", event.messageID, () => {}, true);
    }

    try {
      const params = new URLSearchParams();
      params.append("action", action);
      params.append("imgUrl", imageUrl);

      if (args[1]) {
        const val = args[1];
        if (action === "rotate" || action === "angle") {
          params.append("angle", val);
        } else if (action === "flip") {
          params.append("mode", val.startsWith("v") ? "vertical" : "horizontal");
        } else if (action === "rounded" || action === "circle") {
          params.append("radius", val);
        } else if (action === "resize" && args[2]) {
          params.append("width", args[1]);
          params.append("height", args[2]);
        } else if (!isNaN(Number(val))) {
          params.append("value", val);
        }
      }

      const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/image/canvas?${params.toString()}`;
      const stream = await global.utils.getStreamFromURL(apiUrl, `canvas_${action}.jpg`);

      await message.reply({
        body: `✨ Canvas Action: **${action.toUpperCase()}** applied!`,
        attachment: stream
      });

      if (api.setMessageReaction) {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }
    } catch (err) {
      console.error("Canvas command error:", err);
      if (api.setMessageReaction) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to process canvas effect: ${err.message || err}`);
    }
  }
};
