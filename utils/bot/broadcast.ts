import type { Chat, Client, Contact, Message } from "whatsapp-web.js";
import type { IUser } from "../../app/models/user.model";
import { sendMessage } from "../common";

export const handleBroadcastCommand = async (
  client: Client,
  msg: string,
  chat: Chat,
  contact: Contact,
  message: Message,
  user: IUser
) => {
  if (user.isAdmin)
    sendMessage(
      client,
      contact.id._serialized,
      "Anda tidak memiliki izin untuk melakukan broadcast."
    );

  if (user.state === "registered") {
    user.state = "broadcastStart";
    await user.save();

    sendMessage(
      client,
      contact.id._serialized,
      "Silahkan pilih target broadcast: ketik *user* atau *partner*."
    );
  }

  switch (user.state) {
    case "broadcastStart":
      break;
    default:
      break;
  }
};
