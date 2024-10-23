import GroupChat, { type IGroupChat } from "../../app/models/groupChat.model";
import User, { type IUser } from "../../app/models/user.model";
import {
  Client,
  type Chat,
  type Contact,
  type GroupChat as GC,
  type Message,
} from "whatsapp-web.js";
import { getUserByEmail, getUserByUsername } from "./user";
import { sendErrorToAdmin, sendErrorToUser } from "./error";
import { replyMessage } from "../common";

export const registerGroupChat = async (
  client: Client,
  message: Message,
  contact: Contact,
  chat: Chat
) => {
  try {
    const existingGroupChat: IGroupChat | null = await GroupChat.findOne({
      "groupId._serialized": chat.id._serialized,
      isActive: true,
    });

    if (existingGroupChat)
      replyMessage(
        message,
        "Group chat sudah terdaftar. Gunakan _-commandlist_ untuk melihat daftar command."
      );

    const group = chat as GC;

    const payload = {
      groupId: group.id,
      owner: group.owner,
      size: group.participants.length,
      isActive: true,
    };

    const newGroupChat: IGroupChat = new GroupChat(payload);
    await newGroupChat.save();

    replyMessage(
      message,
      "Selamat, bot sudah dapat digunakan di Group Chat ini."
    );
  } catch (err: any) {
    replyMessage(message, "Terjadi kesalahan saat mendaftarkan group chat.");
    sendErrorToAdmin(
      client,
      contact,
      `Terjadi kesalahan saat mendaftarkan group chat: ${err.message}`
    );

    return;
  }
};

export const startUser = async (
  client: Client,
  contact: Contact,
  message: Message
) => {
  try {
    let userDocs = {
      name: "Not Registered",
      credential: {
        username: Math.random().toString(36),
        email: `${Math.random().toString(36)}@gmail.com`,
        password: "12345678",
      },
      isActive: true,
      state: "askStart",
      whatsapp: {
        id: {
          server: contact.id.server,
          user: contact.id.user,
          _serialized: contact.id._serialized,
        },
        from: message.from,
        number: contact.number,
        name: contact.name ?? contact.pushname,
        isBlocked: contact.isBlocked,
      },
    };
    const newUser: IUser = new User(userDocs);
    await newUser.save();

    return newUser;
  } catch (err: any) {
    sendErrorToUser(
      client,
      contact,
      `Terjadi kesalahan saat mendaftarkan user: ${err.message}`
    );

    return null;
  }
};

export const startUserNext = async (
  client: Client,
  message: Message,
  msg: string,
  contact: Contact,
  user: IUser,
  state: string
) => {
  try {
    if (state === "askStart" && user.name !== "Not Registered")
      state = "askName";

    if (msg.startsWith("-")) {
      await handleUserCommand(client, user, message.from, state);
      return null;
    }

    if (state === "askStart" && user.name === "Not Registered") {
      await processName(client, user, msg);
      return null;
    }
    switch (state) {
      case "askStart":
        await promptForName(client, user);
        break;
      case "askName":
        await processName(client, user, msg);
        break;
      case "askUsername":
        await processUsername(client, user, msg);
        break;
      case "askEmail":
        await processEmail(client, user, msg);
        break;
      case "askGender":
        await processGender(client, user, msg);
        break;
      default:
        client.sendMessage(
          message.from,
          "Gunakan -commandlist untuk melihat daftar command."
        );
        break;
    }

    return null;
  } catch (err: any) {
    console.log(err);
    sendErrorToUser(
      client,
      contact,
      `Terjadi kesalahan saat menyelesaikan pendaftaran: ${err.message}`
    );

    return null;
  }
};

const handleUserCommand = async (
  client: Client,
  user: IUser,
  from: string,
  state: string
) => {
  switch (state) {
    case "askStart":
      await promptForName(client, user);
      break;
    case "askName":
      await promptForName(client, user);
      break;
    case "askUsername":
      await promptForUsername(client, user);
      break;
    case "askEmail":
      await promptForEmail(client, user);
      break;
    case "askGender":
      await promptForGender(client, user);
      break;
    default:
      client.sendMessage(
        from,
        "Gunakan -commandlist untuk melihat daftar command."
      );
      break;
  }
};

const promptForName = async (client: Client, user: IUser) => {
  client.sendMessage(user.whatsapp.id._serialized, "Harap masukkan namamu!");
};

const processName = async (client: Client, user: IUser, msg: string) => {
  user.name = msg;
  user.state = "askUsername";
  await user.save();
  await promptForUsername(client, user);
};

const promptForUsername = async (client: Client, user: IUser) => {
  client.sendMessage(user.whatsapp.id._serialized, "Harap masukkan username!");
};

const processUsername = async (client: Client, user: IUser, msg: string) => {
  const existingUserByUsername = await getUserByUsername(msg);
  if (existingUserByUsername) {
    client.sendMessage(
      user.whatsapp.id._serialized,
      "Username sudah digunakan, silahkan memasukkan username yang lain!"
    );
  } else {
    user.credential.username = msg;
    user.state = "askEmail";
    await user.save();
    await promptForEmail(client, user);
  }
};

const promptForEmail = async (client: Client, user: IUser) => {
  client.sendMessage(user.whatsapp.id._serialized, "Harap masukkan email!");
};

const processEmail = async (client: Client, user: IUser, msg: string) => {
  const existingUserByEmail = await getUserByEmail(msg);
  if (existingUserByEmail) {
    client.sendMessage(
      user.whatsapp.id._serialized,
      "Email sudah digunakan, silahkan memasukkan email yang lain!"
    );
  } else {
    user.credential.email = msg;
    user.state = "askGender";
    await user.save();
    await promptForGender(client, user);
  }
};

const promptForGender = async (client: Client, user: IUser) => {
  client.sendMessage(
    user.whatsapp.id._serialized,
    "Silahkan pilih gender kamu!\nOpsi yang tersedia: Laki-laki, Perempuan, Tidak ingin disebutkan"
  );
};

const processGender = async (client: Client, user: IUser, msg: string) => {
  const validGenders = ["laki-laki", "perempuan", "tidak ingin disebutkan"];
  if (!validGenders.includes(msg.toLocaleLowerCase())) {
    client.sendMessage(
      user.whatsapp.id._serialized,
      "Gender yang kamu input tidak sesuai!\nOpsi yang tersedia: Laki-laki, Perempuan, Tidak ingin disebutkan"
    );
  } else {
    user.gender =
      msg.toLocaleLowerCase() === "tidak ingin disebutkan"
        ? "-"
        : msg.charAt(0).toUpperCase() + msg.slice(1);
    user.state = "registered";
    await user.save();
    client.sendMessage(
      user.whatsapp.id._serialized,
      `Selamat, ${user.credential.username}, nomor ini sudah terdaftar dengan email ${user.credential.email}. Gunakan _-commandlist_ untuk melihat daftar command.`
    );
  }
};
