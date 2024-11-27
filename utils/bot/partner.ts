import Partner, { type IPartner } from "../../app/models/partner.model";
import {
  Client,
  MessageMedia,
  type Chat,
  type Contact,
  type Message,
} from "whatsapp-web.js";
import { sendErrorToAdmin } from "./error";
import type { IUser } from "../../app/models/user.model";
import Service, { type IService } from "../../app/models/service.model";
import User from "../../app/models/user.model";
import { replyMessage, sendMessage } from "../common";
import { datetimeFormat, isToday, isYesterday } from "utilboost";

const forbiddenWord = ["malas", "males", "badmood", "mager"];

export const createCollectionPartner = async (
  client: Client,
  contact: Contact
) => {
  try {
    const payload = {
      userId: null,
      type: null,
      services: {},
      rating: {},
      motorcycle: null,
      policeNumber: null,
      isReady: false,
      reason: null,
      state: "askPartner",
      isActive: false,
    };

    const newPartner: IPartner = new Partner(payload);
    await newPartner.save();

    return newPartner;
  } catch (err: any) {
    sendErrorToAdmin(
      client,
      contact,
      `Terjadi kesalahan saat menambahkan partner: ${err.message}`
    );

    return null;
  }
};

export const partnerReady = async (
  client: Client,
  msg: string,
  message: Message,
  chat: Chat,
  contact: Contact,
  user: IUser
) => {
  try {
    const reason = msg.slice(6).trim();
    const partner = await Partner.findOne({ userId: user.id });

    if (
      forbiddenWord.some((word: string) => reason.toLowerCase().includes(word))
    ) {
      message.reply("BISA GAK JANGAN PAKE ALESAN ITU!!!!!!!!");
      if (["6285727079398@c.us"].includes(contact.id._serialized)) {
        const sticker = MessageMedia.fromFilePath("img/wle.png");
        chat.sendMessage(sticker, { sendMediaAsSticker: true });
      }

      return;
    }

    if (!partner)
      message.reply("Maaf, anda bukan tidak termasuk dalam mitra kami!");
    else {
      partner.isReady = true;
      partner.reason = reason ?? "";
      await partner.save();
      message.reply("Status partner berhasil diubah menjadi ready.");
    }
  } catch (err: any) {
    sendErrorToAdmin(
      client,
      contact,
      `Terjadi kesalahan saat mengubah status partner: ${err.message}`
    );
    message.reply("Gagal mengubah status mitra.");
  }
};

export const partnerBusy = async (
  client: Client,
  msg: string,
  message: Message,
  chat: Chat,
  contact: Contact,
  user: IUser
) => {
  try {
    const reason = msg.slice(6).trim();
    if (!reason) {
      message.reply("Mohon sertakan alasan kenapa mitra sedang sibuk!");
    } else {
      if (
        forbiddenWord.some((word: string) =>
          reason.toLowerCase().replaceAll(" ", "").includes(word)
        )
      ) {
        message.reply("BISA GAK JANGAN PAKE ALESAN ITU!!!!!!!!");
        if (
          ["6289510491535@c.us", "6285727079398@c.us"].includes(
            contact.id._serialized
          )
        ) {
          const sticker = MessageMedia.fromFilePath("img/wle.png");
          chat.sendMessage(sticker, { sendMediaAsSticker: true });
        }

        return;
      }

      const partner = await Partner.findOne({ userId: user.id });

      if (!partner)
        message.reply("Maaf, anda bukan tidak termasuk dalam mitra kami!");
      else {
        partner.isReady = false;
        partner.reason = reason;
        await partner.save();
        message.reply("Status partner berhasil diubah menjadi busy.");
      }
    }
  } catch (err: any) {
    sendErrorToAdmin(
      client,
      contact,
      `Terjadi kesalahan saat mengubah status partner: ${err.message}`
    );
    message.reply("Gagal mengubah status mitra.");
  }
};

export const partnerStatus = async (
  message: Message,
  msg: string,
  chat: Chat,
  isGroup: boolean
) => {
  try {
    const filter: any = { isActive: true };

    const status = msg.slice(8).trim();
    if (status) {
      if (status === "ready") filter.isReady = true;
      else if (status === "busy") filter.isReady = false;
    }

    const partners: IPartner[] = await Partner.find(
      filter,
      "userId services isReady reason updatedAt"
    )
      .sort({ updatedAt: -1 })
      .populate({
        path: "userId",
        select: "name gender whatsapp credential.username",
      })
      .populate({ path: "services.serviceId", select: "shortname" });

    if ((!partners || partners.length === 0) && !status)
      replyMessage(message, "Gagal mencari status mitra. Harap coba lagi.");
    else {
      const getGenderEmote = (gender: string) => {
        return gender === "Laki-laki"
          ? "🧍"
          : gender === "Perempuan"
          ? "🧍‍♀️"
          : "-";
      };
      const formatDate = (date: Date | string) => {
        const updatedDate = new Date(date);
        if (isToday(updatedDate))
          return `Hari ini, ${datetimeFormat(updatedDate, "H:i")}`;
        else if (isYesterday(updatedDate))
          return `Kemarin, ${datetimeFormat(updatedDate, "H:i")}`;
        else return `${datetimeFormat(updatedDate, "d-m H:i")}`;
      };

      const mentions: string[] = [];

      const ready = partners
        .filter((partner: IPartner) => partner.isReady)
        .map((partner: IPartner) => {
          mentions.push(`${partner.userId?.whatsapp.id._serialized}`);

          return `✅ ${getGenderEmote(partner.userId?.gender ?? "-")}${
            partner.userId?.name ?? partner.userId?.credential.username ?? "-"
          } (${formatDate(partner.updatedAt)}${
            isGroup ? `, @${partner.userId?.whatsapp.number}` : ""
          })${partner.reason?.length ? `: ${partner.reason}` : ""}`;
        })
        .join("\n");

      const busy = partners
        .filter((partner: IPartner) => !partner.isReady)
        .map(
          (partner: IPartner) =>
            `❌ ${getGenderEmote(partner.userId?.gender ?? "-")}${
              partner.userId?.name ?? partner.userId?.credential.username ?? "-"
            } (${formatDate(partner.updatedAt)}): ${partner.reason}`
        )
        .join("\n");

      let reply = "";

      if (status) {
        if (status === "ready")
          reply = `Mitra yang ready:\n${
            ready.trim() ? ready : "Tidak ada mitra yang ready."
          }`;
        else if (status === "busy")
          reply = `Mitra yang tidak ready:\n${
            busy.trim() ? busy : "Semua mitra ready."
          }`;
        else
          reply =
            "Parameter status tidak sesuai. Ketik _-status_ tanpa disertai parameter untuk melihat status seluruh mitra.";
      } else
        reply = `Mitra yang ready:\n${
          ready.trim() ? ready : "Tidak ada mitra yang ready"
        }\n\n Mitra yang tidak ready:\n${busy}`;
      replyMessage(message, reply, mentions);
    }
  } catch (err: any) {
    console.log(err.message);
    replyMessage(message, "Terjadi kesalahan saat memperoleh status mitra.");
  }
};

export const partnerNext = async (
  client: Client,
  msg: string,
  message: Message,
  contact: Contact,
  user: IUser,
  partner: IPartner
) => {
  try {
    let state = partner.state;
    if (partner.state === "askPartner" && partner.userId !== null)
      state = "askNumber";

    if (msg.startsWith("-")) {
      await handlePartnerCommand(client, contact, user, message.from, state);
      return null;
    }

    if (state === "askPartner" && partner.userId === null) {
      await processNumber(client, msg, contact, user, partner);
      return null;
    }

    switch (state) {
      case "askPartner":
        await promptForNumber(client, user);
        break;
      case "askNumber":
        await processNumber(client, msg, contact, user, partner);
        break;
      case "askService":
        await processService(client, msg, contact, user, partner);
        break;
      case "askMotorcycle":
        await processMotor(client, msg, contact, user, partner);
        break;
      case "askPoliceNumber":
        await processPoliceNumber(client, msg, contact, user, partner);
        break;
      default:
        client.sendMessage(
          user.whatsapp.id._serialized,
          "Gunakan -commandlist untuk melihat daftar command."
        );
        break;
    }

    return null;
  } catch (err: any) {
    return null;
  }
};

const handlePartnerCommand = async (
  client: Client,
  contact: Contact,
  user: IUser,
  from: string,
  state: string
) => {
  switch (state) {
    case "askPartner":
      await promptForNumber(client, user);
      break;
    case "askNumber":
      await promptForNumber(client, user);
      break;
    case "askService":
      await promptForService(client, contact, user);
      break;
    case "askMotorcycle":
      await promptForMotor(client, user);
      break;
    case "askPoliceNumber":
      await promptForPoliceNumber(client, user);
      break;
    default:
      client.sendMessage(from, "Testing");
      break;
  }
};

const promptForNumber = async (client: Client, user: IUser) =>
  sendMessage(
    client,
    user.whatsapp.id._serialized,
    "Harap masukkan nomor telepon partner!"
  );

const processNumber = async (
  client: Client,
  msg: string,
  contact: Contact,
  user: IUser,
  partner: IPartner
) => {
  try {
    if (!user || !partner) {
      sendMessage(
        client,
        contact.id._serialized,
        "Pengguna atau mitra tidak valid."
      );
      throw new Error("Pengguna atau mitra tidak valid.");
    }

    if (!msg || msg.length < 9)
      sendMessage(
        client,
        user.whatsapp.id._serialized,
        "Nomor telepon yang dimasukkan tidak valid. Harap coba lagi."
      );

    const num = msg.replace(/^08/, "628").replace(/^\+628/, "628");

    const userInfo = await User.searchUserByNumber(num);
    if (userInfo) {
      partner.userId = userInfo.id;
      partner.state = "askService";
      await partner.save();

      await promptForService(client, contact, user);
    } else {
      sendMessage(
        client,
        user.whatsapp.id._serialized,
        `Pengguna dengan nomor telepon ${msg} tidak ditemukan. Harap masukkan ulang nomor telepon partner!`
      );
    }
  } catch (err: any) {
    sendErrorToAdmin(
      client,
      contact,
      `Terjadi kesalahan saat memproses nomor telepon: ${err.message}`
    );
  }
};

const promptForService = async (
  client: Client,
  contact: Contact,
  user: IUser
) => {
  try {
    const services = await Service.getAllServices();

    if (!services || services.length === 0)
      sendMessage(
        client,
        user.whatsapp.id._serialized,
        "Tidak ada layanan yang tersedia saat ini. Silahkan coba lagi nanti."
      );

    const serviceList = services
      .map((srv: IService) => `✅ ${srv.shortname}`)
      .join("\n");

    sendMessage(
      client,
      user.whatsapp.id._serialized,
      `Harap masukkan tipe partner!\nOpsi tersedia:\n${serviceList}\n\n*Jika ingin memasukkan beberapa jasa sekaligus, gunakan '|'.*\nContoh: anjem|jastip`
    );
  } catch (err: any) {
    sendErrorToAdmin(
      client,
      contact,
      `Terjadi kesalahan saat memuat layanan: ${err.message}`
    );
  }
};

const processService = async (
  client: Client,
  msg: string,
  contact: Contact,
  user: IUser,
  partner: IPartner
) => {
  try {
    const reqServices = msg
      .split("|")
      .filter((s) => s.trim())
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1));

    if (reqServices.length === 0)
      sendMessage(
        client,
        user.whatsapp.id._serialized,
        "Silakan masukkan setidaknya satu layanan yang valid."
      );

    const availableServices = await Service.find({
      shortname: { $in: reqServices },
      isActive: true,
    });

    if (!availableServices || availableServices.length === 0)
      sendMessage(
        client,
        user.whatsapp.id._serialized,
        "Tidak ada layanan yang tersedia saat ini."
      );

    const missingServices = reqServices.filter(
      (service) =>
        !availableServices.some((available) => available.shortname === service)
    );

    if (missingServices.length > 0)
      sendMessage(
        client,
        user.whatsapp.id._serialized,
        `Layanan berikut tidak tersedia: ${missingServices.join(", ")}`
      );

    const serviceIds = availableServices.map((service) => ({
      serviceId: service.id,
      pricelistId: null,
    }));

    partner.services = serviceIds;
    partner.state = "askMotorcycle";
    await partner.save();

    await promptForMotor(client, user);
  } catch (err: any) {
    sendErrorToAdmin(
      client,
      contact,
      `Terjadi kesalahan saat memproses layanan: ${err.message}`
    );
  }
};

const promptForMotor = async (client: Client, user: IUser) =>
  sendMessage(
    client,
    user.whatsapp.id._serialized,
    "Harap masukkan jenis motor yang digunakan!Ketik '*skip*' untuk melewati."
  );

const processMotor = async (
  client: Client,
  msg: string,
  contact: Contact,
  user: IUser,
  partner: IPartner
) => {
  try {
    const trimmedMsg = msg.trim().toLowerCase();

    if (trimmedMsg === "skip") {
      partner.state = "finished";
      partner.isReady = true;
      partner.isActive = true;
      await partner.save();

      user.state = "registered";
      user.partnerId = null;
      await user.save();

      const partnerUser = await Partner.findById(partner.id).populate({
        path: "userId",
        select: "name credential.username",
      });
      if (partnerUser && partner.userId) {
        await User.findByIdAndUpdate(partnerUser.userId.id, {
          isPartner: true,
        });

        sendMessage(
          client,
          user.whatsapp.id._serialized,
          `Selamat, ${partnerUser.userId?.credential.username} sudah menjadi mitra.`
        );
      } else {
        sendMessage(
          client,
          user.whatsapp.id._serialized,
          "Data mitra tidak ditemukan, harap coba lagi."
        );
      }
    } else {
      if (!trimmedMsg || trimmedMsg.length < 3)
        sendMessage(
          client,
          user.whatsapp.id._serialized,
          "Mohon masukkan nama motor yang valid (minimal 3 karakter) atau ketik '*skip*' untuk melewati."
        );

      partner.motorcycle = msg;
      partner.state = "askPoliceNumber";
      await partner.save();

      await promptForPoliceNumber(client, user);
    }
  } catch (err: any) {
    sendErrorToAdmin(
      client,
      contact,
      `Terjadi kesalahan saat memproses informasi motor: ${err.message}`
    );
  }
};

const promptForPoliceNumber = async (client: Client, user: IUser) =>
  sendMessage(
    client,
    user.whatsapp.id._serialized,
    "Harap masukkan plat nomot motormu!\nKetik '*skip*' untuk melewati."
  );

const processPoliceNumber = async (
  client: Client,
  msg: string,
  contact: Contact,
  user: IUser,
  partner: IPartner
) => {
  try {
    const trimmedMsg = msg.trim();

    if (trimmedMsg.toLowerCase() !== "skip") {
      if (!/^[A-Z0-9\s]+$/.test(trimmedMsg) || trimmedMsg.length < 3)
        sendMessage(
          client,
          user.whatsapp.id._serialized,
          "Mohon masukkan nomor polisi yang valid (minimal 3 karakter, hanya huruf dan angka) atau ketik 'skip' untuk melewati."
        );
      partner.policeNumber = trimmedMsg.toUpperCase();
    }

    partner.state = "finished";
    partner.isReady = true;
    partner.isActive = true;
    await partner.save();

    user.state = "registered";
    user.partnerId = null;
    await user.save();

    const partnerUser = await Partner.findById(partner.id).populate({
      path: "userId",
      select: "name credential.username",
    });

    if (partnerUser && partnerUser.userId) {
      await User.findByIdAndUpdate(partnerUser.userId.id, { isPartner: true });

      sendMessage(
        client,
        user.whatsapp.id._serialized,
        `Selamat, ${partnerUser.userId?.credential.username} sudah menjadi mitra.`
      );
    } else {
      sendMessage(
        client,
        user.whatsapp.id._serialized,
        "Data mitra tidak ditemukan. Silakan coba lagi."
      );
    }
  } catch (err: any) {
    sendErrorToAdmin(
      client,
      contact,
      `Terjadi kesalahan saat memproses nomor polisi: ${err.message}`
    );
  }
};
