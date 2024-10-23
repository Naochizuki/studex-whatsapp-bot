import type { Chat, Client, Contact, Message } from "whatsapp-web.js";
import type { IGroupChat } from "../../app/models/groupChat.model";
import { getActiveCommands, getCommandList } from "./command";
import type { IUser } from "../../app/models/user.model";
import GroupChat from "../../app/models/groupChat.model";
import { registerGroupChat, startUser, startUserNext } from "./start";
import { replyMessage, sendMessage } from "../common";
import { getAllGroupChat } from "./groupChat";
import User from "../../app/models/user.model";
import Partner from "../../app/models/partner.model";
import {
  createCollectionPartner,
  partnerBusy,
  partnerNext,
  partnerReady,
  partnerStatus,
} from "./partner";
import { sendErrorToAdmin } from "./error";

export const handleCommandGroupFlow = async (
  client: Client,
  msg: string,
  chat: Chat,
  message: Message,
  contact: Contact,
  group: IGroupChat
) => {
  if (!msg || !group)
    sendMessage(
      client,
      contact.id._serialized,
      "Pesan tidak valid atau group chat tidak ditemukan."
    );

  const command = await getActiveCommands(client, chat, contact, msg);

  if (command) {
    await handleGroupCommand(msg, chat, contact, message, client, group);
  }
};

export const handleCommandUserFlow = async (
  client: Client,
  msg: string,
  chat: Chat,
  contact: Contact,
  message: Message,
  user: IUser
) => {
  if (!msg || !user)
    sendMessage(
      client,
      contact.id._serialized,
      "Pesan tidak valid atau pengguna tidak ditemukan."
    );

  const command = await getActiveCommands(client, chat, contact, msg);

  if (command) {
    user.lastCommand = msg;
    await user.save();

    await handleUserCommand(msg, chat, contact, message, client, user);
  } else if (!chat.isGroup) {
    message.reply("Mohon maaf, command tidak ada dalam daftar.");
  }
};

export const handleNonRegisteredGroupCommand = async (
  client: Client,
  msg: string,
  chat: Chat,
  contact: Contact,
  message: Message
) => {
  let group = await GroupChat.searchGroupChat(chat.id._serialized);

  if (!group && msg === "-start") {
    await registerGroupChat(client, message, contact, chat);
  } else if (!group && msg !== "-start") {
    sendMessage(
      client,
      chat.id._serialized,
      "Gunakan command _-start_ untuk menggunakan bot ini!"
    );
  }
};

export const handleNonRegisteredUserCommand = async (
  client: Client,
  msg: string,
  chat: Chat,
  contact: Contact,
  message: Message
) => {
  const sameGroup = await contact.getCommonGroups();
  const groupChats = await getAllGroupChat(client, contact);

  const verified = sameGroup.some((group) =>
    groupChats?.find((db) => db.groupId._serialized === group._serialized)
  );

  if (verified) {
    let user = await User.searchUser(contact.id._serialized);

    if (!user && msg === "-start") {
      const start = await startUser(client, contact, message);
      if (start) {
        sendMessage(
          client,
          start.whatsapp.id._serialized,
          "Harap masukkan namamu!"
        );
      } else
        replyMessage(message, "Terjadi kesalahan saat mendaftarkan pengguna.");
    } else if (user && isUserInRegistrationFlow(user.state)) {
      await startUserNext(client, message, msg, contact, user, user.state);
    } else if (!user && msg !== "-start") {
      sendMessage(
        client,
        chat.id._serialized,
        "Gunakan command _-start_ untuk menggunakan bot ini!"
      );
    }
  }
};

export const handleNonCommandFlow = async (
  client: Client,
  msg: string,
  chat: Chat,
  contact: Contact,
  message: Message,
  user: IUser
) => {
  if (!msg || !user)
    sendMessage(
      client,
      contact.id._serialized,
      "Pesan tidak valid atau pengguna tidak ditemukan."
    );

  let partner = null;
  if (user.lastCommand === "-addpartner")
    partner = await Partner.findById(user.partnerId);

  if (
    isUserInRegistrationFlow(user.state) ||
    isPartnerInRegistrationFlow(partner?.state ?? "")
  ) {
    await handleUserLastCommand(msg, chat, contact, message, client, user);
  }
};

export const isUserInRegistrationFlow = (state: string) => {
  const registrationStates = [
    "askStart",
    "askName",
    "askUsername",
    "askEmail",
    "askGender",
  ];
  return registrationStates.includes(state ?? "");
};

const isPartnerInRegistrationFlow = (state: string) => {
  const registrationStates = [
    "askPartner",
    "askNumber",
    "askService",
    "askMotorcycle",
    "askPoliceNumber",
  ];
  return registrationStates.includes(state ?? "");
};

const handleUserLastCommand = async (
  msg: string,
  chat: Chat,
  contact: Contact,
  message: Message,
  client: Client,
  user: IUser
) => {
  try {
    if (!msg || !user)
      sendMessage(
        client,
        contact.id._serialized,
        "Pesan tidak valid atau pengguna tidak ditemukan."
      );

    if (!chat.isGroup && user.state.startsWith("ask")) {
      switch (user.lastCommand) {
        case "-start":
          await startUserNext(client, message, msg, contact, user, user?.state);
          break;
        case "-addpartner":
          if (user.isAdmin) {
            let partner = await Partner.findById(user.partnerId);

            if (!partner)
              sendMessage(
                client,
                user.whatsapp.id._serialized,
                "Data Partner tidak ditemukan"
              );
            else
              await partnerNext(client, msg, message, contact, user, partner);
          }
          break;
        default:
          break;
      }
    }
  } catch (err: any) {
    sendErrorToAdmin(client, contact, err.message);
  }
};

const handleInfoCommand = async (message: Message, user: IUser) => {
  try {
    let reply = `Menampilkan informasi Anda:\n- *ID* : ${user._id?.toString()}\n- *Nama* : ${
      user.name
    }\n- *Username* : ${user.credential.username}\n- *Email* : ${
      user.credential.email
    }\n- *Nomor Terdaftar* : ${user.whatsapp.number}`;

    if (user.isPartner) {
      const partner = await Partner.findOne({ userId: user.id }).populate({
        path: "services.serviceId",
        select: "fullname shortname tag",
      });

      const services = partner?.services
        .map((service) => service.serviceId?.fullname)
        .join(", ");

      reply += `\n\nInformasi Partner:\n- *Jasa*: ${services}\n- *Sepeda Motor*: ${
        partner?.motorcycle ?? "-"
      }\n- *Ready*: ${partner?.isReady ? "Ya" : "Tidak"}\n- *Alasan*: ${
        partner?.reason ?? "-"
      }`;
    }

    if (user.isAdmin) {
      reply += `\n\nInformasi Admin:\n- *State saat ini* : ${
        user.state
      }\n- *Partner ID* : ${user.partnerId ?? "-"}`;
    }

    replyMessage(message, reply);
  } catch (err) {
    replyMessage(message, "Terjadi kesalahan saat memproses informasi user.");
  }
};

const handleAddPartner = async (
  client: Client,
  msg: string,
  message: Message,
  contact: Contact,
  user: IUser
) => {
  try {
    let partner = null;

    if (user.state === "registered" && !user.partnerId) {
      partner = await createCollectionPartner(client, contact);
      if (partner) {
        user.partnerId = partner.id;
        user.state = "askPartner";
        await user.save();
      }
    } else {
      partner = await Partner.findById(user.partnerId);
    }

    if (!partner)
      sendMessage(
        client,
        user.whatsapp.id._serialized,
        "Data Partner tidak ditemukan"
      );
    else await partnerNext(client, msg, message, contact, user, partner);
  } catch (err: any) {
    sendErrorToAdmin(
      client,
      contact,
      `Terjadi kesalahan saat menambahkan mitra: ${err.message}`
    );
  }
};

const handleGroupCommand = async (
  msg: string,
  chat: Chat,
  contact: Contact,
  message: Message,
  client: Client,
  group: IGroupChat
) => {
  try {
    if (!msg || !group)
      sendMessage(
        client,
        contact.id._serialized,
        "Pesan tidak valid atau group chat tidak ditemukan."
      );

    if (chat.isGroup && group) {
      switch (msg) {
        case "-commandlist":
          await getCommandList(client, message, chat, contact);
          break;
        case "-start":
          replyMessage(
            message,
            "Group chat sudah terdaftar. Gunakan _-commandlist_ untuk melihat daftar command."
          );
          break;
        case msg.startsWith("-status") && msg:
          await partnerStatus(message, msg, chat);
          break;
        default:
          replyMessage(
            message,
            "Command tidak ditemukan. Gunakan _-commandlist_ untuk melihat daftar command."
          );
          break;
      }
    }
  } catch (err: any) {
    sendErrorToAdmin(client, contact, err.message);
  }
};

const handleUserCommand = async (
  msg: string,
  chat: Chat,
  contact: Contact,
  message: Message,
  client: Client,
  user: IUser
) => {
  try {
    if (!msg || !user)
      sendMessage(
        client,
        contact.id._serialized,
        "Pesan tidak valid atau pengguna tidak ditemukan."
      );

    if (!chat.isGroup && user) {
      switch (msg) {
        case "-commandlist":
          await getCommandList(client, message, chat, contact);
          break;
        case "-start":
          if (user.state.startsWith("-ask")) {
            await startUserNext(
              client,
              message,
              msg,
              contact,
              user,
              user.state
            );
          } else {
            replyMessage(
              message,
              "Anda sudah memulai proses sebelumnya. Gunakan command _-info_ untuk melihat status."
            );
          }
          break;
        case "-ready":
          await partnerReady(client, message, contact, user);
          break;
        case msg.startsWith("-busy") && msg:
          await partnerBusy(client, msg, message, contact, user);
          break;
        case "-info":
          await handleInfoCommand(message, user);
          break;
        case "-addpartner":
          if (user.isAdmin)
            await handleAddPartner(client, msg, message, contact, user);
          else if (user.isPartner)
            replyMessage(message, "Hanya admin yang dapat menambahkan mitra.");
          break;
        case msg.startsWith("-status") && msg:
          await partnerStatus(message, msg, chat);
          break;
        default:
          replyMessage(
            message,
            "Command tidak ditemukan. Gunakan _-commandlist_ untuk melihat daftar command."
          );
          break;
      }
    }
  } catch (err: any) {
    sendErrorToAdmin(client, contact, err.message);
  }
};
