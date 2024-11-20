import { Schema, Model, model } from "mongoose";
import MongooseDelete, { type SoftDeleteDocument } from "mongoose-delete";

interface WAUser {
  server: string;
  user: string;
  _serialized: string;
}

interface TGroupChat extends SoftDeleteDocument {
  groupId: WAUser;
  // owner: WAUser;
  isPartner: boolean;
  isActive: boolean;
}

export interface IGroupChat extends TGroupChat {
  searchGroupChat(groupId: string): Promise<IGroupChat | null>;
}

interface GroupChatModel extends Model<IGroupChat> {
  searchGroupChat(groupId: string): Promise<IGroupChat | null>;
}

const groupChatSchema: Schema<IGroupChat> = new Schema(
  {
    groupId: {
      server: {
        type: String,
        required: true,
        default: "c.us",
      },
      user: {
        type: String,
        required: true,
      },
      _serialized: {
        type: String,
        required: true,
        unique: [true, "Group chat sudah terdaftar"],
      },
    },
    // owner: {
    //   server: {
    //     type: String,
    //     required: true,
    //     default: "c.us",
    //   },
    //   user: {
    //     type: String,
    //     required: true,
    //   },
    //   _serialized: {
    //     type: String,
    //     required: true,
    //   },
    // },
    // size: {
    //   type: Number,
    //   required: true,
    //   default: 2,
    // },
    isPartner: {
      type: Boolean,
      required: true,
      default: false,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

groupChatSchema.static(
  "searchGroupChat",
  async function searchGroupChat(groupId: string) {
    const query: any = {
      isActive: true,
      "groupId._serialized": groupId,
    };

    const group = await this.findOne(query).exec();
    return group;
  }
);

groupChatSchema.plugin(MongooseDelete, {
  deletedAt: true,
  deletedBy: true,
  overrideMethods: true,
});

const GroupChat = model<IGroupChat, GroupChatModel>(
  "GroupChats",
  groupChatSchema
);

export default GroupChat;
