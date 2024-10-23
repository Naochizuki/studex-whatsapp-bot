import GroupChat, { type IGroupChat } from "../../app/models/groupChat.model";
import User, { type IUser } from "../../app/models/user.model";
import { Client, type Chat, type Contact } from "whatsapp-web.js";
import { sendErrorToAdmin } from "./error";

export const addUserTogroup = async (
  client: Client,
  contact: Contact,
  userId: string,
  groupId: string
) => {
  try {
    const user = await User.findById(userId);

    if (!user) throw new Error("User tidak ditemukan.");

    if (user) await user.addGroup(groupId);

    return user;
  } catch (err: any) {
    sendErrorToAdmin(
      client,
      contact,
      `Gagal menambahkan pengguna ke grup: ${err.message}`
    );
    return;
  }
};

export const isRegistered = async (
  client: Client,
  chat: Chat,
  contact: Contact
) => {
  try {
    let exist: null | IGroupChat | IUser = chat.isGroup
      ? await GroupChat.searchGroupChat(chat.id._serialized)
      : await User.searchUser(contact.id._serialized, false);

    return {
      exist: !!exist,
      user: !chat.isGroup ? (exist as IUser) : null,
      groupChat: chat.isGroup ? (exist as IGroupChat) : null,
    };
  } catch (err: any) {
    handleVerificationError(client, chat, contact, err);
    return null;
  }
};

export const getUserByUsername = async (username: string) => {
  try {
    const user = User.findOne({ "credential.username": username });

    return user;
  } catch (err: any) {
    return null;
  }
};

export const getUserByEmail = async (email: string) => {
  try {
    const user = User.findOne({ "credential.email": email });

    return user;
  } catch (err: any) {
    return null;
  }
};

export const getUserByNumber = async (number: string) => {
  try {
    const user = User.findOne({ "whatsapp.number": number });

    return user;
  } catch (err: any) {
    return null;
  }
};

const handleVerificationError = async (
  client: Client,
  chat: Chat,
  contact: Contact,
  err: any
) => {
  const errorMessage = chat.isGroup
    ? `Terjadi kesalahan saat mengecek status verifikasi group: ${err.message}`
    : `Terjadi kesalahan saat mengecek status verifikasi user: ${err.message}`;

  await sendErrorToAdmin(client, contact, errorMessage);
};
