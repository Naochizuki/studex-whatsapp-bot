import Command from "../../app/models/command.model";
import GroupChat from "../../app/models/groupChat.model";
import User from "../../app/models/user.model";
import { Client, type Chat, type Contact, type Message } from "whatsapp-web.js";
import { sendErrorToAdmin } from "./error";
import { replyMessage } from "../common";

export const getActiveCommands = async (
  client: Client,
  chat: Chat,
  contact: Contact,
  msg: string
) => {
  try {
    let filter: any = { isActive: true };

    if (chat.isGroup) {
      const groupChat = await GroupChat.searchGroupChat(chat.id._serialized);

      filter.isGroup = true;
      filter.isAdmin = false;

      if (!groupChat?.isPartner) {
        filter.isPartner = false;
      }
    } else {
      const user = await User.searchUser(contact.id._serialized);

      filter.isPersonal = true;

      if (!user?.isPartner) filter.isPartner = false;

      if (!user?.isAdmin) filter.isAdmin = false;
    }
    const commands = await Command.find(filter, "command isPersonal");
    const searchCommand =
      msg.indexOf(" ") !== -1 ? msg.substring(0, msg.indexOf(" ")) : msg;
    return commands
      ? commands.find((command) => command.command?.includes(searchCommand))
      : null;
  } catch (err: any) {
    sendErrorToAdmin(
      client,
      contact,
      `Terjadi kesalahan saat mengambil command aktif: ${err.message}`
    );

    return null;
  }
};

export const getCommandList = async (
  client: Client,
  message: Message,
  chat: Chat,
  contact: Contact
) => {
  try {
    let filter: any = { isActive: true };

    if (chat.isGroup) {
      const groupChat = await GroupChat.findOne({
        "groupId._serialized": chat.id._serialized,
        isActive: true,
      });

      filter.isGroup = true;
      filter.isAdmin = false;

      if (!groupChat?.isPartner) {
        filter.isPartner = false;
      }
    } else {
      const user = await User.findOne({
        isActive: true,
        "whatsapp.id._serialized": contact.id._serialized,
      });

      filter.isPersonal = true;

      if (!user?.isPartner) {
        filter.isPartner = false;
      }

      if (!user?.isAdmin) {
        filter.isAdmin = false;
      }
    }

    const commands = await Command.find(
      filter,
      "name command description"
    ).sort({
      order: 1,
      command: 1,
    });

    if (!commands.length) return "Tidak ada command yang tersedia saat ini.";

    const commandList = commands
      .map((cmd) => `✅ _${cmd.command}_ : ${cmd.name} (${cmd.description})`)
      .join("\n");

    replyMessage(
      message,
      `Berikut daftar command yang bisa digunakan:\n${commandList}`
    );
  } catch (err: any) {
    sendErrorToAdmin(
      client,
      contact,
      `Terjadi kesalahan saat mengambil daftar command: ${err.message}`
    );
  }
};
