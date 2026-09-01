const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
        config: {
                name: "pfp",
                aliases: ["profilepic", "getpfp"],
                version: "2.0",
                author: "frnAlt & Gtajisan",
                countDown: 5,
                role: 0,
                description: {
                        vi: "Lấy ảnh đại diện Telegram của người dùng",
                        en: "Fetch Telegram user's profile picture"
                },
                category: "utility",
                guide: {
                        vi: '   {pn}: Lấy ảnh đại diện của bạn'
                                + '\n   {pn} <@tag>: Lấy ảnh đại diện của người được tag'
                                + '\n   {pn} <user_id>: Lấy ảnh đại diện từ Telegram User ID'
                                + '\n   {pn} <@username>: Lấy ảnh đại diện từ Telegram username'
                                + '\n   (Hoặc reply tin nhắn của ai đó)',
                        en: '   {pn}: Fetch your profile picture'
                                + '\n   {pn} <@tag>: Fetch tagged user\'s profile picture'
                                + '\n   {pn} <user_id>: Fetch profile picture from Telegram User ID'
                                + '\n   {pn} <@username>: Fetch profile picture from Telegram username'
                                + '\n   (Or reply to someone\'s message)'
                }
        },

        langs: {
                vi: {
                        fetching: "🔍 Đang lấy ảnh đại diện Telegram...",
                        success: "✓ Ảnh đại diện Telegram của %1",
                        error: "× Không thể lấy ảnh đại diện: %1",
                        invalidUID: "! User ID hoặc username Telegram không hợp lệ"
                },
                en: {
                        fetching: "🔍 Fetching Telegram profile picture...",
                        success: "✓ Telegram profile picture of %1",
                        error: "× Could not fetch profile picture: %1",
                        invalidUID: "! Invalid Telegram User ID or Username"
                }
        },

        onStart: async function ({ api, message, args, event, getLang, usersData }) {
                try {
                        let uid = event.senderID;
                        
                        if (event.messageReply) {
                                uid = event.messageReply.senderID;
                        } else if (event.mentions && Object.keys(event.mentions).length > 0) {
                                uid = Object.keys(event.mentions)[0];
                        } else if (args[0]) {
                                const cleanArg = args[0].replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "");
                                if (!isNaN(cleanArg)) {
                                        uid = cleanArg;
                                } else if (cleanArg) {
                                        try {
                                                const userInfo = await api.getUserInfo(cleanArg);
                                                if (userInfo && userInfo[cleanArg]) {
                                                        uid = cleanArg;
                                                }
                                        } catch (e) {}
                                }
                        }
                        
                        if (!uid) return message.reply(getLang("invalidUID"));
                        
                        await message.reply(getLang("fetching"));
                        
                        const userInfo = await api.getUserInfo(uid);
                        const userObj = userInfo[uid] || {};
                        const userName = userObj.name || (await usersData.getName(uid)) || `User (${uid})`;

                        let avatarURL = userObj.thumbUrl || userObj.avatar;
                        if (!avatarURL || avatarURL.includes("facebook.com")) {
                                avatarURL = `https://api.dicebear.com/7.x/bottts/png?seed=${encodeURIComponent(uid)}&size=512`;
                        }
                        
                        const cachePath = path.join(__dirname, "cache", `pfp_${uid}.jpg`);
                        await fs.ensureDir(path.dirname(cachePath));
                        
                        const response = await axios.get(avatarURL, { responseType: "arraybuffer" });
                        await fs.writeFile(cachePath, Buffer.from(response.data));
                        
                        await message.reply({
                                body: getLang("success", userName),
                                attachment: fs.createReadStream(cachePath)
                        });
                        
                        await fs.remove(cachePath);
                } catch (err) {
                        console.error("Error in pfp command:", err);
                        return message.reply(getLang("error", err.message));
                }
        }
};