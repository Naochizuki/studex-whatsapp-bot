import { Schema, Model, model } from "mongoose";
import MongooseDelete, { type SoftDeleteDocument } from "mongoose-delete";
import validator from "validator";

const isEmail = validator.isEmail;

interface TUser extends SoftDeleteDocument {
  name: string;
  gender: string;
  isAdmin: boolean;
  isPartner: boolean;
  credential: {
    username: string;
    email: string;
    password: string;
  };
  isActive: boolean;
  state: string;
  lastCommand: string;
  partnerId: Schema.Types.ObjectId | null;
  whatsapp: {
    id: {
      server: string;
      user: string;
      _serialized: string;
    };
    from: string;
    number: string;
    name: string;
    isBlocked: boolean;
  };
  groups: any[];
  resetToken?: string;
  resetTokenExpiration?: Date;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
}

export interface IUser extends TUser {
  login(identifier: string, password: string): any;
  toggleActiveStatus(id: string): any;
  searchUser(contactId: string, isAdmin?: boolean): Promise<IUser | null>;
  searchUserByNumber(number: string): Promise<IUser | null>;
  searchUsers(
    searchQuery: string,
    page: number,
    limit: number,
    filter: Partial<IUser>
  ): any;
  resetPassword(email: string, newPassword: string, token: string): any;
  addGroup(groupId: string): any;
  removeGroup(groupId: string): any;
}

interface UserModel extends Model<IUser> {
  login(identifier: string, password: string): any;
  toggleActiveStatus(id: string): any;
  searchUser(contactId: string, isAdmin?: boolean): Promise<IUser>;
  searchUserByNumber(number: string): Promise<IUser | null>;
  searchUsers(
    searchQuery: string,
    page: number,
    limit: number,
    filter: Partial<IUser>
  ): any;
  resetPassword(email: string, newPassword: string, token: string): any;
  addGroup(groupId: string): any;
  removeGroup(groupId: string): any;
}

const userSchema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Nama pengguna diperlukan."],
    },
    gender: {
      type: String,
      enum: ["-", "Laki-laki", "Perempuan"],
      required: true,
      default: "-",
    },
    isAdmin: {
      type: Boolean,
      required: true,
      default: false,
    },
    isPartner: {
      type: Boolean,
      required: true,
      default: false,
    },
    credential: {
      username: {
        type: String,
        required: [true, "Harap masukan username"],
        unique: [true, "Username sudah ada"],
      },
      email: {
        type: String,
        required: [true, "Harap masukkan email"],
        unique: [true, "Email sudah ada"],
        validate: [isEmail, "Harap masukan email yang valid"],
      },
      password: {
        type: String,
        required: true,
        minlength: [8, "Panjang password minimal 8 karakter."],
      },
    },
    isActive: {
      type: Boolean,
      required: true,
    },
    state: {
      type: String,
      required: true,
      default: "askStart",
    },
    lastCommand: {
      type: String,
      required: true,
      default: "-start",
    },
    partnerId: {
      type: Schema.Types.ObjectId,
      required: false,
      default: null,
      ref: "Partners",
    },
    whatsapp: {
      id: {
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
        },
      },
      from: {
        type: String,
        required: true,
      },
      number: {
        type: String,
        required: true,
        unique: [true, "Nomor ini sudah terdaftar sebagai pengguna."],
      },
      name: {
        type: String,
        required: true,
      },
      isBlocked: {
        type: Boolean,
        required: true,
        default: false,
      },
    },
    groups: [
      {
        type: Schema.Types.ObjectId,
        ref: "GroupChats",
      },
    ],
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (this: IUser, next) {
  this.credential.password = await Bun.password.hash(this.credential.password, {
    algorithm: "bcrypt",
  });
  next();
});

userSchema.static(
  "login",
  async function login(identifier: string, password: string) {
    const user = await this.findOne({
      $or: [
        { "credential.username": identifier },
        { "credential.email": identifier },
      ],
      isActive: true,
    });

    if (user) {
      const auth = await Bun.password.verify(
        password,
        user.credential?.password ?? ""
      );
      if (auth) {
        return user;
      }

      throw Error("errorCredentials");
    }

    throw Error("errorCredentials");
  }
);

userSchema.static(
  "toggleActiveStatus",
  async function toggleActiveStatus(id: string) {
    const users = await this.findById(id);
    if (!users) {
      throw new Error("Pengguna tidak ditemukan.");
    }

    users.isActive = !users.isActive;
    return await users.save();
  }
);

userSchema.static(
  "searchUser",
  async function searchUser(contactId: string, isAdmin: boolean = false) {
    const query: any = isAdmin
      ? {
          isActive: true,
          isAdmin: true,
          "whatsapp.id._serialized": contactId,
        }
      : {
          isActive: true,
          "whatsapp.id._serialized": contactId,
        };

    const user = await this.findOne(query).exec();
    return user;
  }
);

userSchema.static(
  "searchUserByNumber",
  async function searchUserByNumber(number: string) {
    const query: any = {
      isActive: true,
      "whatsapp.number": number,
    };

    const user = await this.findOne(query).exec();
    return user;
  }
);

userSchema.static(
  "searchUsers",
  async function searchUsers(
    searchQuery: string,
    page: number = 1,
    limit: number = 10,
    filter: Partial<IUser> = {}
  ) {
    const skip = (page - 1) * limit;

    const query: any = {
      ...filter,
      $or: [
        { name: { $regex: searchQuery, $options: "i" } },
        { "credential.username": { $regex: searchQuery, $options: "i" } },
        { "credential.email": { $regex: searchQuery, $options: "i" } },
        { "whatsapp.number": { $regex: searchQuery, $options: "i" } },
      ],
    };

    const users = await this.find(query).skip(skip).limit(limit).exec();
    const total = await this.countDocuments(query);
    return {
      data: users,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }
);

userSchema.static(
  "resetPassword",
  async function resetPassword(
    email: string,
    newPassword: string,
    token: string
  ) {
    const user = await this.findOne({
      "credential.email": email,
      resetToken: token,
      resetTokenExpiration: { $gt: new Date() },
    });

    if (!user) {
      throw new Error("Token tidak valid atau telah kadaluarsa.");
    }

    user.credential.password = await Bun.password.hash(newPassword, {
      algorithm: "bcrypt",
    });
    user.resetToken = undefined;
    user.resetTokenExpiration = undefined;
    return await user.save();
  }
);

userSchema.method("addGroup", async function addGroup(groupId: string) {
  if (!this.groups.includes(groupId)) {
    this.groups.push(groupId);
    await this.save();
  }

  return this;
});

userSchema.method("removeGroup", async function removeGroup(groupId: string) {
  this.groups = this.groups.filter((group: string) => group !== groupId);
  await this.save();

  return this;
});

userSchema.plugin(MongooseDelete, {
  deletedAt: true,
  deletedBy: true,
  overrideMethods: true,
});

const User = model<IUser, UserModel>("Users", userSchema);

export default User;
