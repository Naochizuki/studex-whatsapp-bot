import GroupChat from "../../app/models/groupChat.model";
import { Client } from "whatsapp-web.js";
import { sendErrorToAdmin } from "./error";

export const getAllGroupChat = async (client: Client, contact: any) => {
  try {
    const groupChats = await GroupChat.find({ isActive: true }, "groupId");

    return groupChats.map((group) => group);
  } catch (err: any) {
    sendErrorToAdmin(
      client,
      contact,
      `Terjadi kesalahan saat mengambil daftar group chat: ${err.message}`
    );

    return;
  }
};
