const axios = require('axios');
const jimp = require("jimp");
const fs = require("fs");

module.exports = {
  config: {
    name: "fak",
    aliases: ["fuck"],
    version: "1.0",
    author: "your name",
    countDown: 20,
    role: 2,
    shortDescription: "",
    longDescription: "",
    category: "nsfw",
    guide: "{pn}"
  },

  onStart: async function ({ message, event, args }) {
    const mention = Object.keys(event.mentions);
    if (mention.length == 0) {
      return message.reply("Please mention someone");
    } else if (mention.length == 1) {
      const one = event.senderID;
      const two = mention[0];
      bal(one, two).then(ptth => {
        message.reply({ body: "「 Harder daddy 🥵💦 」", attachment: fs.createReadStream(ptth) });
      }).catch(error => {
        console.error(error);
        message.reply("Failed to generate the image.");
      });
    } else {
      const one = mention[1];
      const two = mention[0];
      bal(one, two, api).then(ptth => {
        message.reply({ body: "", attachment: fs.createReadStream(ptth) });
      }).catch(error => {
        console.error(error);
        message.reply("Failed to generate the image.");
      });
    }
  }
};

async function getAvatarUrl(uid, api) {
    try {
        if (api && typeof api.getUserInfo === "function") {
            const userInfo = await api.getUserInfo(uid);
            if (userInfo && userInfo[uid] && userInfo[uid].thumbUrl) {
                return userInfo[uid].thumbUrl;
            }
        }
    } catch (e) {}
    return `https://api.dicebear.com/7.x/bottts/png?seed=${encodeURIComponent(uid)}&size=512`;
}

async function bal(one, two, api) {
  const url1 = await getAvatarUrl(one, api);
  const url2 = await getAvatarUrl(two, api);
  const avone = await jimp.read(url1);
  avone.circle();
  const avtwo = await jimp.read(url2);
  avtwo.circle();
  const pth = "fucked.png";
  const img = await jimp.read("https://i.ibb.co/YpR7Bpv/image.jpg");

  img.resize(639, 480).composite(avone.resize(90, 90), 23, 320).composite(avtwo.resize(100, 100), 110, 60);

  await img.writeAsync(pth);
  return pth;
}