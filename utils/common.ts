import type { Client, Message } from "whatsapp-web.js";

export const handleErrors = (err: any): { [key: string]: string } => {
  let errorPath: { [key: string]: string } = {};

  if (err.message.includes("validation failed")) {
    console.log(err);
    errorPath = Object.values(err.errors).reduce(
      (acc: { [key: string]: string }, error: any) => {
        let path = error.properties.path
          .replace(".", " ")
          .replace(/([A-Z])/g, " $1");

        path = path.charAt(0).toUpperCase() + path.slice(1);
        acc[path] = error.message;
        return acc;
      },
      {}
    );
  }
  return errorPath;
};

export const sendMessage = async (
  client: Client,
  target: string,
  message: string
) => client.sendMessage(target, message);

export const replyMessage = async (
  message: Message,
  msg: string,
  mentions: string[] = []
) => message.reply(msg, (await message.getChat()).id._serialized, { mentions });
