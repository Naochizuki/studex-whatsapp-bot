import type { ChatGPTAPI } from "chatgpt";

export const askGpt = async (GPTClient: ChatGPTAPI, msg: string) => {
  const content = msg.slice(5).trim();
  const chatCompletion = await GPTClient.sendMessage(content);

  console.log(chatCompletion);
};
