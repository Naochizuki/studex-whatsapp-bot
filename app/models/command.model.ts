import { Schema, Model, model } from "mongoose";
import MongooseDelete, { type SoftDeleteDocument } from "mongoose-delete";

interface TCommand extends SoftDeleteDocument {
  name: string;
  command: string;
  description: string;
  isParent: boolean;
  parentId?: Schema.Types.ObjectId | null;
  isPartner: boolean;
  isAdmin: boolean;
  isPersonal: boolean;
  isGroup: boolean;
  isActive: boolean;
  order: number;
}

export interface ICommand extends TCommand {
  getCommands(
    page: number,
    limit: number,
    searchQuery: string,
    filter: Partial<ICommand>
  ): any;
  getSubcommands(parentId: string): any;
  toggleActiveStatus(id: string): any;
  getCommandsByAccess(
    isPartner: boolean,
    isGroup: boolean,
    isPersonel: boolean,
    isAdmin: boolean
  ): any;
}

interface CommandModel extends Model<ICommand> {
  getCommands(
    page: number,
    limit: number,
    searchQuery: string,
    filter: Partial<ICommand>
  ): any;
  getSubcommands(parentId: string): any;
  toggleActiveStatus(id: string): any;
  getCommandsByAccess(
    isPartner: boolean,
    isGroup: boolean,
    isPersonel: boolean,
    isAdmin: boolean
  ): any;
}

const commandSchema: Schema<ICommand> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Nama perintah harus diisi."],
    },
    command: {
      type: String,
      required: [true, "Perintah harus diisi."],
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Deskripsi harus diisi."],
    },
    isParent: {
      type: Boolean,
      required: true,
      default: false,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Commands",
      required: false,
      default: null,
    },
    isPartner: {
      type: Boolean,
      required: true,
      default: false,
    },
    isAdmin: {
      type: Boolean,
      required: true,
      default: false,
    },
    isPersonal: {
      type: Boolean,
      required: true,
      default: true,
    },
    isGroup: {
      type: Boolean,
      required: true,
      default: false,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    order: {
      type: Number,
      required: true,
      default: 999,
    },
  },
  {
    timestamps: true,
  }
);

commandSchema.static(
  "getCommands",
  async function getCommands(
    page: number = 1,
    limit: number = 10,
    searchQuery: string = "",
    filter: Partial<ICommand> = { isActive: true }
  ) {
    const skip = (page - 1) * limit;

    const query: any = {
      ...filter,
      $or: [
        { name: { $regex: searchQuery, $options: "i" } },
        { command: { $regex: searchQuery, $options: "i" } },
      ],
    };

    const commands = await this.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ order: 1 })
      .exec();

    const total = await this.countDocuments(query);
    return {
      data: commands,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }
);

commandSchema.static(
  "getSubcommands",
  async function getSubcommands(parentId: string) {
    return await this.find({ parentId }).sort({ order: 1 }).exec();
  }
);

commandSchema.static(
  "toggleActiveStatus",
  async function toggleActiveStatus(id: string) {
    const command = await this.findById(id);
    if (!command) {
      throw new Error("Perintah tidak ditemukan.");
    }

    command.isActive = !command.isActive;
    return await command.save();
  }
);

commandSchema.static(
  "getCommandsByAccess",
  async function getCommandsByAccess(
    isPartner: boolean,
    isGroup: boolean,
    isPersonal: boolean,
    isAdmin: boolean = false
  ) {
    const query: any = isAdmin
      ? {
          isPersonal,
          isGroup,
          $or: [
            {
              isPartner,
            },
          ],
        }
      : {
          isGroup,
          isPersonal,
          $or: [
            {
              isAdmin,
            },
            {
              isPartner,
            },
          ],
        };

    return await this.find(query).sort({ order: 1 }).exec();
  }
);

commandSchema.plugin(MongooseDelete, {
  deletedAt: true,
  deletedBy: true,
  overrideMethods: true,
});

const Command = model<ICommand, CommandModel>("Commands", commandSchema);

export default Command;
