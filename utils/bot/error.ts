import User, { type IUser } from "../../app/models/user.model";
import { Client, type Contact } from "whatsapp-web.js";

export const sendErrorToAdmin = async (
  client: Client,
  contact: Contact,
  err: string = "Terjadi kesalahan!",
  type: string = "General"
) => {
  const admin: IUser | null = await User.searchUser(
    contact.id._serialized,
    true
  );

  if (admin) {
    await client.sendMessage(admin.whatsapp.id._serialized, `${type}: ${err}`);
  }
};

export const sendErrorToUser = async (
  client: Client,
  contact: Contact,
  err: string = "Terjadi kesalahan!",
  type: string = "General"
) => {
  const user: IUser | null = await User.searchUser(
    contact.id._serialized,
    false
  );

  if (user) {
    await client.sendMessage(user.whatsapp.id._serialized, `${type}: ${err}`);
  }
};

export const sendErrorWithRetry = async (
  client: Client,
  contact: Contact,
  err: string = "Terjadi kesalahan!",
  retryMessage: string = "Silahkan coba lagi dengan perintah ulang."
) => {
  await sendErrorToUser(client, contact, err);
  await client.sendMessage(contact.id._serialized, retryMessage);
};
