import { Client, LocalAuth, type Chat, type Contact } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import fs from "fs";
import { isRegistered } from "./bot/user";
import {
  handleCommandGroupFlow,
  handleCommandUserFlow,
  handleNonCommandFlow,
  handleNonRegisteredGroupCommand,
  handleNonRegisteredUserCommand,
} from "./bot/handler";

// Inisialisasi Whatsapp Client
export const client1 = new Client();
let qrCodeUrl = null;

const connectWA = async () => {
  try {
    // Menampilkan QR Code untuk login
    client1.on("qr", async (qr) => {
      qrCodeUrl = await qrcode.toDataURL(qr);

      fs.writeFileSync('latest_qr.txt', qr);
      console.log('QR code saved to lastest_qr.txt');
      // console.log("QR code received, please scan:");
      // qrcode.generate(qr, { small: true }); // Menampilkan QR di terminal
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
        const contact: Contact = await message.getContact();
        const registered = await isRegistered(client1, chat, contact);
        const msg: string = message?.body;

        if (msg.startsWith("-")) {
          if (registered?.exist && registered.user) {
            await handleCommandUserFlow(
              client1,
              msg,
              chat,
              contact,
              message,
              registered.user
            );
          } else if (registered?.exist && registered.groupChat) {
            await handleCommandGroupFlow(
              client1,
              msg,
              chat,
              message,
              contact,
              registered.groupChat
            );
          } else if (!chat.isGroup && contact.isUser) {
            await handleNonRegisteredUserCommand(
              client1,
              msg,
              chat,
              contact,
              message
            );
          } else if (chat.isGroup) {
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
            registered.user
          );
        }
      } catch (err: any) {
        console.log(`Error handling message: ${err.message}`);
      }
    });

    // Inisialisasi client;
    client1.initialize();

    return qrCodeUrl;
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

export default connectWA;
