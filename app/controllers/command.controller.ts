import Command from "../models/command.model";
import { handleErrors } from "../../utils/common";

export const createCommand = async (req: any, res: any) => {
  const commandDocs = req.body;
  try {
    commandDocs.isActive = true;
    const newCommand = new Command(commandDocs);
    await newCommand.save();

    res.status(200).json(newCommand);
  } catch (err: any) {
    const errors = handleErrors(err);
    res.status(400).json(errors);
  }
};

export const getCommands = async (req: any, res: any) => {
  try {
    const commands = await Command.find({ isActive: true });

    res.status(200).json(commands);
  } catch (err: any) {
    res.status(500).json({ message: err.messsage });
  }
};
