import { Schema, Model, model } from "mongoose";
import MongooseDelete, { type SoftDeleteDocument } from "mongoose-delete";

interface TService extends SoftDeleteDocument {
  fullname: string;
  shortname: string;
  description?: string;
  tag: string;
  isActive: boolean;
}

export interface IService extends TService {
  getServices(
    page: number,
    limit: number,
    filter: Partial<IService>,
    searchQuery: string,
    sort: string
  ): any;
  getAllServices(): Promise<IService[]>;
  toggleActiveStatus(id: string): any;
}

interface ServiceModel extends Model<IService> {
  getServices(
    page: number,
    limit: number,
    filter: Partial<IService>,
    searchQuery: string,
    sort: string
  ): any;
  getAllServices(): Promise<IService[]>;
  toggleActiveStatus(id: string): any;
}

const serviceSchema: Schema<IService> = new Schema(
  {
    fullname: {
      type: String,
      required: [true, "Nama lengkap diperlukan."],
    },
    shortname: {
      type: String,
      required: [true, "Nama singkat diperlukan."],
    },
    description: {
      type: String,
      required: false,
    },
    tag: {
      type: String,
      required: [true, "Tag diperlukan"],
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

serviceSchema.static(
  "getServices",
  async function getServices(
    page: number = 1,
    limit: number = 10,
    filter: Partial<IService> = { isActive: true },
    searchQuery: string = "",
    sort: string = "createdAt"
  ) {
    const skip: number = (page - 1) * limit;
    const query: any = {
      ...filter,
      $or: [
        { fullname: { $regex: searchQuery, $options: "i" } },
        { shortname: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } },
        { tag: { $regex: searchQuery, $options: "i" } },
      ],
    };

    const services = await this.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ [sort]: 1 })
      .exec();

    const total = await this.countDocuments(query);

    return {
      data: services,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }
);

serviceSchema.static("getAllServices", async function getAllServices() {
  const query: any = {
    isActive: true,
  };

  const services = this.find(query).exec();
  return services;
});

serviceSchema.static(
  "toggleActiveStatus",
  async function toggleActiveStatus(id: string) {
    const services = await this.findById(id);
    if (!services) {
      throw new Error("Layanan tidak ditemukan.");
    }

    services.isActive = !services.isActive;
    return await services.save();
  }
);

serviceSchema.plugin(MongooseDelete, {
  deletedAt: true,
  deletedBy: true,
  overrideMethods: true,
});

const Service = model<IService, ServiceModel>("Services", serviceSchema);

export default Service;
