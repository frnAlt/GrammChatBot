<div align="center">

![GrammChatBot Cute Normal Anime Girl Mascot](./images/banner.jpg)

# ⚡ GrammChatBot - FCA to TCA Framework Port (GoatBot V2)

```
   ██████╗ ██████╗  █████╗ ███╗   ███╗███╗   ███╗██████╗██╗██╗  ██╗██████╗  ██████╗ ████████╗
  ██╔════╝ ██╔══██╗██╔══██╗████╗ ████║████╗ ████║██╔════╝██║██║  ██║██╔══██╗██╔═══██╗╚══██╔══╝
  ██║  ███╗██████╔╝███████║██╔████╔██║██╔████╔██║██║     ██║███████║██████╔╝██║   ██║   ██║   
  ██║   ██║██╔══██╗██╔══██║██║╚██╔╝██║██║╚██╔╝██║██║     ██║██╔══██║██╔══██╗██║   ██║   ██║   
  ╚██████╔╝██║  ██║██║  ██║██║ ╚═╝ ██║██║ ╚═╝ ██║╚██████╗██║██║  ██║██████╔╝╚██████╔╝    ██║   
   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝     ╚═╝ ╚═════╝╚═╝╚═╝  ╚═╝╚═════╝  ╚═════╝    ╚═╝   
```

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Telegram Bot API](https://img.shields.io/badge/Telegram-Bot%20API-blue.svg)](https://core.telegram.org/bots/api)
[![Node.js Engine](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)

**GrammChatBot** is an elite Node.js bot framework that provides a **1-to-1 API Adapter Port** of [Goatbot-V2](https://github.com/lazyneoaz/Goatbot-V2.git) from Facebook Messenger (FCA) to Telegram (TCA).

By utilizing the built-in **FCA to TCA Adapter Layer** ([`system/api-adapter.js`](./system/api-adapter.js)), existing Goatbot V2 Facebook commands using `api.sendMessage()`, `event.threadID`, and `event.senderID` run natively on Telegram **without rewriting command logic**!

</div>

---

## 🔥 Key Features

- **FCA to TCA Adapter Layer**: Intercepts Telegram updates and maps them to standard Facebook Chat API (`api`) and event (`event`) objects.
- **Multi-Token Failover**: Array of Telegram Bot tokens in `config.json`. Automatically switches tokens on `429 Too Many Requests` or blocks, and alerts the Developer ID.
- **5-Level Role Permission Matrix**:
  - **Level 0 (User)**: Basic commands.
  - **Level 1 (Premium User)**: Premium commands & higher limits (`/admin premium add`).
  - **Level 2 (Group Admin)**: Group management (`ctx.getChatMember`).
  - **Level 3 (Bot Admin)**: Bot management (`adminBot` in `config.json`).
  - **Level 4 (Developer)**: Master access (`devUsers`). Required for `/shell` and `/eval`.
- **Developer Command Suite**:
  - `/eval`: Evaluates raw JavaScript directly in runtime (Level 4 Developer Only).
  - `/shell`: Executes host terminal commands (Level 4 Developer Only).
- **AI Image Tools (Direct Stream)**: `/image`, `/edit`, `/upscale`, `/removebg`. Streams image buffers directly via `ctx.replyWithPhoto({ source: stream })` to minimize RAM usage.
- **Smart Typo Suggestions**: Uses Levenshtein distance algorithm to find closest loaded commands (e.g. `/imgge` -> *"Command not found. Did you mean /image?"*).
- **Express Web Dashboard**: Serves uptime, total users, total groups, RAM usage, active token index, and health endpoints (`GET /` and `GET /health`).
- **512MB RAM & Storage Optimization**: 30-minute cron job wipes `/cache` folders and invokes Node `global.gc()` (`--expose-gc --max-old-space-size=400`).

---

## 📂 Project Structure

```
GrammChatBot/
├── images/
│   └── banner.jpg              # Normal Cute Anime Girl Mascot Banner
├── index.js                    # Main process entry launcher
├── Goat.js                     # Core bot framework orchestrator
├── bot.js                      # Telegram event listener & router
├── config.json                 # Bot tokens, developer ID & permission lists
├── package.json                # Project dependencies (grammy, express, etc.)
├── system/
│   └── api-adapter.js          # Core FCA-to-TCA API Wrapper Adapter
├── includes/
│   ├── handleReply.js          # System listener for onReply
│   ├── handleReaction.js       # System listener for onReaction
│   └── handleEvent.js          # System listener for onEvent
├── bot/
│   ├── telegram/
│   │   ├── tokenManager.js     # Multi-token manager & rate-limit failover
│   │   └── handlerTelegram.js  # grammY update interceptor & role matrix
│   └── cron/
│       └── autoCleanup.js      # 30-minute cache & memory cleanup cron job
├── dashboard/                  # Express.js Web Dashboard
│   ├── app.js                  # Express web server & statistics routes
│   └── views/
│       └── stats.eta           # Real-time HTML stats dashboard template
├── utils/
│   └── levenshtein.js          # Levenshtein distance typo suggestion engine
├── test/
│   └── testAll.js              # Comprehensive automated test suite (100% Pass)
└── scripts/
    └── cmds/                   # Modular commands folder
        ├── example.js          # FCA-syntax command test (/examplecmd)
        ├── newcommand.eg.js    # Template command file
        ├── eval.js             # Level 4 Developer JS evaluator
        ├── shell.js            # Level 4 Developer shell executor
        ├── admin.js            # Level 3/4 Admin control panel
        ├── image.js            # AI image generator (Stream)
        ├── edit.js             # AI image editor (Stream)
        ├── upscale.js          # AI 4K image upscaler (Stream)
        ├── removebg.js         # AI background remover (Stream)
        ├── help.js             # Dynamic command menu
        ├── stats.js            # Bot memory & status
        └── ping.js             # Latency check
```

---

## ⚙ Configuration (`config.json`)

Configure your Telegram Bot Tokens, Developer ID, Admin IDs, and Premium IDs in `config.json`:

```json
{
  "telegramTokens": [
    "7123456789:AAEF... (Primary Bot Token from @BotFather)",
    "7987654321:AABX... (Backup Bot Token 1)",
    "7555555555:AACC... (Backup Bot Token 2)"
  ],
  "tokenRotation": {
    "autoRotateOnRateLimit": true,
    "retryAttempts": 3,
    "cooldownMs": 60000
  },
  "prefix": "/",
  "noPrefix": true,
  "adminBot": [
    "123456789"
  ],
  "premiumUsers": [
    "123456789"
  ],
  "devUsers": [
    "YOUR_TELEGRAM_USER_ID"
  ],
  "dashBoard": {
    "enable": true,
    "port": 5000
  }
}
```

---

## 💻 Developer Guide: Writing Commands in Native FCA Syntax

Thanks to [`system/api-adapter.js`](./system/api-adapter.js), you can write commands using the exact original Goatbot-V2 Facebook syntax:

```javascript
module.exports = {
  config: {
    name: "hello",
    aliases: ["hi"],
    version: "2.0",
    author: "NeoKEX",
    countDown: 2,
    role: 0,
    description: { en: "Say hello using classic Goatbot FCA syntax" },
    category: "utility"
  },

  // Classic Goatbot V2 signature
  onStart: async function ({ api, event, args, message, getLang }) {
    // api.sendMessage maps internally to Telegram's sendMessage!
    api.sendMessage(
      `Hello! Your Telegram ID is ${event.senderID} and Chat ID is ${event.threadID}.`,
      event.threadID,
      (err, info) => {
        // api.setMessageReaction maps to Telegram message reactions!
        api.setMessageReaction("👋", event.messageID, event.threadID);
      },
      event.messageID
    );
  }
};
```

---

## 🧪 Testing & Verification

Run the comprehensive automated test suite:
```bash
node test/testAll.js
```
Expected Output:
```
==================================================
📊 TEST RESULTS: 14 Passed, 0 Failed
==================================================
```

---

## 🚀 Installation & Deployment Guide

### 1. Local Setup
```bash
git clone https://github.com/frnAlt/GrammChatBot.git
cd GrammChatBot
npm install
# Edit config.json with your Telegram tokens and user ID
npm start
```

### 2. Render (Free Tier 512MB RAM)
1. Create a **Web Service** on [Render](https://render.com).
2. Connect your GitHub repository.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Set Environment Variable: `PORT=5000`

### 3. Railway
1. Deploy project from GitHub on [Railway](https://railway.app).
2. Add `PORT=5000` environment variable.
3. Railway automatically detects `npm start`.

### 4. VPS Deployment (PM2)
```bash
npm install -g pm2
pm2 start index.js --name "grammchatbot" --node-args="--expose-gc --max-old-space-size=400"
pm2 save
pm2 startup
```

---

## 📜 License

- **Original Architecture**: [Goat-Bot-V2](https://github.com/ntkhang03/Goat-Bot-V2) by NTKhang & Modded by NeoKEX.
- **Telegram Adapter Port**: GrammChatBot by NeoKEX.
- **License**: MIT
