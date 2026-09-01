const axios = require("axios");

module.exports = {
  config: {
    name: "pair",
    aliases: ["match", "love", "pairing"],
    version: "2.0.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Pair two people with canvas card"
    },
    longDescription: {
      en: "Pairs you with a random group member or a mentioned user with love percentage and custom canvas graphic"
    },
    category: "fun",
    guide: {
      en: "{pn} (pair with random member)\n{pn} @mention (pair with mentioned member)"
    }
  },

  onStart: async function ({ api, event, usersData, message }) {
    const { threadID, messageID, senderID, mentions } = event;

    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const participantIDs = threadInfo?.userInfo?.map(u => u.id) || [];
      const botID = api.getCurrentUserID();
      const senderData = await usersData.get(senderID);
      const nameSender = senderData?.name || "User";

      let uid2, name2;

      if (mentions && Object.keys(mentions).length > 0) {
        uid2 = Object.keys(mentions)[0];
        const u2Data = await usersData.get(uid2);
        name2 = u2Data?.name || mentions[uid2]?.replace("@", "") || "Partner";
      } else {
        const listUserID = participantIDs.filter(id => id != botID && id != senderID);
        if (listUserID.length > 0) {
          uid2 = listUserID[Math.floor(Math.random() * listUserID.length)];
          const u2Data = await usersData.get(uid2);
          name2 = u2Data?.name || "Partner";
        } else if (event.messageReply?.senderID && event.messageReply.senderID !== senderID) {
          uid2 = event.messageReply.senderID;
          const u2Data = await usersData.get(uid2);
          name2 = u2Data?.name || "Partner";
        } else {
          uid2 = botID || "777";
          name2 = "GrammBot";
        }
      }

      if (api.setMessageReaction) {
        api.setMessageReaction("💖", messageID, () => {}, true);
      }

      const avatar1 = await global.utils.extractImageUrl([], { senderID }, api) || `https://api.dicebear.com/7.x/bottts/png?seed=${encodeURIComponent(senderID)}&size=512`;
      const avatar2 = await global.utils.extractImageUrl([], { senderID: uid2 }, api) || `https://api.dicebear.com/7.x/bottts/png?seed=${encodeURIComponent(uid2)}&size=512`;
      const lovePercent = Math.floor(Math.random() * 51) + 50; // 50% to 100%

      const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/canvas/pair?avatar1=${encodeURIComponent(avatar1)}&avatar2=${encodeURIComponent(avatar2)}&name1=${encodeURIComponent(nameSender)}&name2=${encodeURIComponent(name2)}`;

      const stream = await global.utils.getStreamFromURL(apiUrl, "pair.png");

      const arrayTag = [
        { id: senderID, tag: nameSender },
        { id: uid2, tag: name2 }
      ];

      await message.reply({
        body: `🥰 Match Made in Heaven! 💌 Wishing you both endless happiness 💕\n\n💞 Love Ratio: ${lovePercent}%\n👥 ${nameSender} 💖 ${name2}`,
        mentions: arrayTag,
        attachment: stream
      });

      if (api.setMessageReaction) {
        api.setMessageReaction("✅", messageID, () => {}, true);
      }
    } catch (err) {
      console.error("Pair command error:", err);
      if (api.setMessageReaction) {
        api.setMessageReaction("❌", messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to generate pair canvas: ${err.message || err}`);
    }
  }
};
