const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "slap",
    aliases: ["batslap"],
    version: "1.0.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Create slap meme"
    },
    longDescription: {
      en: "Create a slap meme using user and target PFP"
    },
    category: "fun",
    guide: {
      en: "{pn} @mention\n{pn} (reply)"
    }
  },

  onStart: async function ({ api, event }) {
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);

    let filePath;

    try {
      let uid;

      if (event.mentions && Object.keys(event.mentions).length) {
        uid = Object.keys(event.mentions)[0];
      } else if (event.messageReply?.senderID) {
        uid = event.messageReply.senderID;
      } else {
        return api.sendMessage(
          "👤 Please mention or reply to a user.",
          event.threadID,
          event.messageID
        );
      }

      // Telegram native avatar logic

      const image1 =
        `https://api.dicebear.com/7.x/bottts/png?seed={event.senderID}&size=512` +
        `?width=720&height=720`;

      const image2 =
        `https://api.dicebear.com/7.x/bottts/png?seed={uid}&size=512` +
        `?width=720&height=720`;

      const apiUrl =
        `https://toshiro-api-editz6t9.vercel.app/api/canvas/batslap` +
        `?image1=${encodeURIComponent(image1)}` +
        `&image2=${encodeURIComponent(image2)}`;

      filePath = path.join(
        cacheDir,
        `slap_${Date.now()}.png`
      );

      const response = await axios.get(apiUrl, {
        responseType: "arraybuffer",
        timeout: 60000,
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      });

      await fs.writeFile(filePath, response.data);

      await api.sendMessage(
        {
          attachment: fs.createReadStream(filePath)
        },
        event.threadID,
        event.messageID
      );

    } catch (error) {
      console.error("SLAP:", error.message);

      await api.sendMessage(
        `❌ Failed to generate slap image.\n\n${error.response?.status || error.message}`,
        event.threadID,
        event.messageID
      );

    } finally {
      if (filePath && await fs.pathExists(filePath)) {
        await fs.remove(filePath).catch(() => {});
      }
    }
  }
};