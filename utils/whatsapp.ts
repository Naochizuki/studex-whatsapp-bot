import { Client, LocalAuth, type Chat, type Contact } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { ChatGPTAPI } from "chatgpt";
import { isRegistered } from "./bot/user";
import {
  handleCommandGroupFlow,
  handleCommandUserFlow,
  handleNonCommandFlow,
  handleNonRegisteredGroupCommand,
  handleNonRegisteredUserCommand,
} from "./bot/handler";
import "dotenv/config";

// OpenAI Client
export const GPTClient = new ChatGPTAPI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
});

// Inisialisasi Whatsapp Client
export const client1 = new Client({
  authStrategy: new LocalAuth({
    clientId: "whatsapp-bot-1",
  }),
});

const connectWA = async () => {
  try {
    // Menampilkan QR Code untuk login
    client1.on("qr", async (qr) => {
      console.log("QR code received, please scan:");
      qrcode.generate(qr, { small: true }); // Menampilkan QR di terminal
    });

    // Event ketika sudah terautentikasi
    client1.on("authenticated", () => {
      console.log("WhatsApp authenticated successfully!");
    });

    // Event ketika sesi gagal
    client1.on("auth_failure", (msg) => {
      console.error("Authentication failed:", msg);
    });

    // Event ketika bot siap digunakan
    client1.on("ready", () => {
      console.log("Whatsapp bot is ready!");

      // Mendapatkan nomor WhatsApp yang digunakan
      const number = client1.info.wid.user;
      console.log(`Logged in as: ${number}`);
    });

    // Event ketika menerima pesan
    client1.on("message", async (message) => {
      try {
        const chat: Chat = await message.getChat();
        const isGroup: boolean = chat.isGroup ?? chat.id.server === "g.us";
        const contact: Contact = await message.getContact();
        const registered = await isRegistered(client1, chat, contact, isGroup);
        const msg: string = message?.body;

        if (msg.startsWith("-")) {
          if (registered?.exist && registered.user) {
            await handleCommandUserFlow(
              client1,
              msg,
              chat,
              contact,
              message,
              registered.user,
              isGroup,
              GPTClient
            );
          } else if (registered?.exist && registered.groupChat) {
            await handleCommandGroupFlow(
              client1,
              msg,
              chat,
              message,
              contact,
              registered.groupChat,
              isGroup
            );
          } else if (!isGroup && contact.isUser) {
            await handleNonRegisteredUserCommand(
              client1,
              msg,
              chat,
              contact,
              message
            );
          } else if (isGroup) {
            await handleNonRegisteredGroupCommand(
              client1,
              msg,
              chat,
              contact,
              message
            );
          }
        } else if (registered?.user) {
          await handleNonCommandFlow(
            client1,
            msg,
            chat,
            contact,
            message,
            registered.user,
            isGroup
          );
        }
      } catch (err: any) {
        console.log(`Error handling message: ${err.message}`);
      }
    });

    // Inisialisasi client;
    client1.initialize();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

export default connectWA;
