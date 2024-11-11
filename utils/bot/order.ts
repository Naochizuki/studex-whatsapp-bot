import type { Client, Contact, Message } from "whatsapp-web.js";
import type { IUser } from "../../app/models/user.model";
import { sendErrorToAdmin } from "./error";
import type { IOrder } from "../../app/models/order.model";
import Order from "../../app/models/order.model";
import Partner from "../../app/models/partner.model";
import { sendMessage } from "../common";

export const createCollectionOrder = async (
  client: Client,
  contact: Contact,
  payload: any
) => {
  try {
    const newOrder: IOrder = new Order(payload);
    await newOrder.save();

    return newOrder;
  } catch (err: any) {
    sendErrorToAdmin(
      client,
      contact,
      `Terjadi kesalahan saat menambahkan pesanan: ${err.message}`
    );

    return null;
  }
};

export const handleOrderForwardedMessage = async (
  client: Client,
  msg: string,
  message: Message,
  contact: Contact,
  user: IUser
) => {
  try {
    if (user.state === "registered" && user.isPartner) {
      user.state = "addOrder";
      await user.save();

      sendMessage(
        client,
        contact.id._serialized,
        "Silahkan forward pesan order dari customer"
      );
    }

    if (message.isForwarded) {
      const date = new Date(message.timestamp * 1000);
      const localDate = new Date(date.toString());

      const forwardedChat = await message.getChat();
      console.log(
        forwardedChat,
        message.isForwarded,
        localDate,
        date.toString()
      );
    }
  } catch (e: any) {}
};
