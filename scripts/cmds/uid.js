const { findUid } = global.utils;
const regExCheckURL = /^(http|https):\/\/[^ "]+$/;

module.exports = {
	config: {
		name: "uid",
		version: "1.3",
		author: "NTKhang",
		countDown: 5,
		role: 0,
		description: {
			vi: "Xem Telegram User ID của người dùng",
			en: "View Telegram user ID of user"
		},
		category: "info",
		guide: {
			vi: "   {pn}: dùng để xem ID Telegram của bạn"
				+ "\n   {pn} @tag: xem ID Telegram của những người được tag"
				+ "\n   {pn} <link/username>: xem ID Telegram từ username hoặc link t.me/..."
				+ "\n   Phản hồi tin nhắn của người khác kèm lệnh để xem ID Telegram của họ",
			en: "   {pn}: use to view your Telegram user ID"
				+ "\n   {pn} @tag: view Telegram user ID of tagged people"
				+ "\n   {pn} <link/username>: view Telegram user ID from username or t.me link"
				+ "\n   Reply to someone's message with the command to view their Telegram user ID"
		}
	},

	langs: {
		vi: {
			syntaxError: "Vui lòng tag người muốn xem uid hoặc để trống để xem uid của bản thân"
		},
		en: {
			syntaxError: "Please tag the person you want to view uid or leave it blank to view your own uid"
		}
	},

	onStart: async function ({ message, event, args, getLang }) {
		if (event.messageReply)
			return message.reply(event.messageReply.senderID);
		if (!args[0])
			return message.reply(event.senderID);
		if (args[0].match(regExCheckURL)) {
			let msg = '';
			for (const link of args) {
				try {
					const uid = await findUid(link);
					msg += `${link} => ${uid}\n`;
				}
				catch (e) {
					msg += `${link} (ERROR) => ${e.message}\n`;
				}
			}
			message.reply(msg);
			return;
		}

		let msg = "";
		const { mentions } = event;
		for (const id in mentions)
			msg += `${mentions[id].replace("@", "")}: ${id}\n`;
		message.reply(msg || getLang("syntaxError"));
	}
};