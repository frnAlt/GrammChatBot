const axios = require('axios');
const fs = require('fs-extra'); 
const path = require('path');

const API_ENDPOINT = "https://dev.oculux.xyz/api/artv1"; 

module.exports = {
  config: {
    name: "art",
    aliases: ["artv1", "draw"],
    version: "1.0", 
    author: "frnAlt & Gtajisan",
    countDown: 15,
    role: 0,
    longDescription: "Generate an image using the ArtV1 model.",
    category: "ai-image",
    guide: {
      en: "{pn} <prompt>"
    }
  },

  onStart: async function({ message, args, event }) {
    
    let prompt = args.join(" ");

    if (!prompt || !/^[\x00-\x7F]*$/.test(prompt)) {
        return message.reply("❌ Please provide a valid English prompt to generate an image.");
    }

    message.reaction("⏳", event.messageID);
    let tempFilePath; 

    try {
      const cacheDir = path.join(__dirname, 'cache');
      if (!fs.existsSync(cacheDir)) {
          await fs.mkdirp(cacheDir); 
      }
      tempFilePath = path.join(cacheDir, `artv1_output_${Date.now()}.png`);

      let imageDownloadResponse;
      try {
        const fullApiUrl = `${API_ENDPOINT}?p=${encodeURIComponent(prompt.trim())}`;
        imageDownloadResponse = await axios.get(fullApiUrl, {
            responseType: 'stream',
            timeout: 15000 
        });
      } catch (err) {
        const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;
        imageDownloadResponse = await axios.get(fallbackUrl, {
            responseType: 'stream',
            timeout: 30000
        });
      }

      const writer = fs.createWriteStream(tempFilePath);
      imageDownloadResponse.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", (err) => {
          writer.close();
          reject(err);
        });
      });

      message.reaction("✅", event.messageID);
      await message.reply({
        body: `✨ <b>Art Image Generated</b>\nPrompt: ${prompt}`,
        attachment: fs.createReadStream(tempFilePath)
      });

    } catch (error) {
      message.reaction("❌", event.messageID);
      
      let errorMessage = "An error occurred during image generation.";
      if (error.response) {
         if (error.response.status === 404) {
             errorMessage = "API Endpoint not found (404).";
         } else {
             errorMessage = `HTTP Error: ${error.response.status}`;
         }
      } else if (error.code === 'ETIMEDOUT') {
         errorMessage = `Generation timed out. Try a simpler prompt or check API status.`;
      } else if (error.message) {
         errorMessage = `${error.message}`;
      } else {
         errorMessage = `Unknown error.`;
      }

      console.error("ArtV1 Command Error:", error);
      message.reply(`❌ ${errorMessage}`);
    } finally {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
          await fs.unlink(tempFilePath); 
      }
    }
  }
};