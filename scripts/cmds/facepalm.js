const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "facepalm",
    aliases: ["fp"],
    version: "1.0.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Apply facepalm effect"
    },
    longDescription: {
      en: "Apply facepalm effect to a mentioned or replied user's PFP"
    },
    category: "fun",
    guide: {
      en: "{pn} @mention\n{pn} (reply to a user)"
    }
  },

  onStart: async function ({ api, event }) {
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);

    let filePath;

    try {
      let uid;

      if (
        event.mentions &&
        Object.keys(event.mentions).length > 0
      ) {
        uid = Object.keys(event.mentions)[0];
      } else if (event.messageReply?.senderID) {
        uid = event.messageReply.senderID;
      } else {
        return api.sendMessage(
          "🤦 Please mention or reply to a user.",
          event.threadID,
          event.messageID
        );
      }

      // Telegram native avatar logic

      const image =
        `https://api.dicebear.com/7.x/bottts/png?seed={uid}&size=512` +
        `?width=720&height=720` +
        ``;

      const apiUrl =
        `https://toshiro-api-editz6t9.vercel.app/api/canvas/facepalm` +
        `?image=${encodeURIComponent(image)}`;

      filePath = path.join(
        cacheDir,
        `facepalm_${uid}_${Date.now()}.png`
      );

      const response = await axios.get(apiUrl, {
        responseType: "arraybuffer",
        timeout: 60000,
        maxRedirects: 5,
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "image/png,image/jpeg,image/*,*/*"
        }
      });

      if (!response.data) {
        throw new Error("Empty response from Facepalm API.");
      }

      await fs.writeFile(
        filePath,
        Buffer.from(response.data)
      );

      await api.sendMessage(
        {
          attachment: fs.createReadStream(filePath)
        },
        event.threadID,
        event.messageID
      );

    } catch (error) {
      console.error(
        "Facepalm:",
        error.response?.status || error.message
      );

      await api.sendMessage(
        `❌ Failed to generate facepalm.\n\n${error.response?.status || error.message}`,
        event.threadID,
        event.messageID
      );

    } finally {
      if (
        filePath &&
        await fs.pathExists(filePath)
      ) {
        await fs.remove(filePath).catch(() => {});
      }
    }
  }
};