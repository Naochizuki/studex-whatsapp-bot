import { Schema, Model, model } from "mongoose";
import MongooseDelete, { type SoftDeleteDocument } from "mongoose-delete";

interface Prices {
  name: string;
  price: string;
  description?: string;
}

interface TPricelist extends SoftDeleteDocument {
  serviceId: Schema.Types.ObjectId;
  list: { [key: string | number]: Prices };
  isActive: boolean;
}

export interface IPricelist extends TPricelist {
  getPricelistByServiceId(serviceId: string): any;
  updatePricelist(id: string, updateData: Partial<IPricelist>): any;
  toggleActiveStatus(id: string): any;
}

interface PricelistModel extends Model<IPricelist> {
  getPricelistByServiceId(serviceId: string): any;
  updatePricelist(id: string, updateData: Partial<IPricelist>): any;
  toggleActiveStatus(id: string): any;
}

const pricelistSchema: Schema<IPricelist> = new Schema(
  {
    serviceId: {
      type: Schema.Types.ObjectId,
      required: [true, "ID layanan diperlukan"],
      ref: "Services",
    },
    list: {
      type: Map,
      of: Schema.Types.Mixed,
      required: [true, "Daftar harga diperlukan"],
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

pricelistSchema.static(
  "getPricelistByServiceId",
  async function getPricelistByServiceId(serviceId: string) {
    return await this.find({ serviceId, isActive: true }).exec();
  }
);

pricelistSchema.static(
  "updatePricelist",
  async function updatePricelist(id: string, updateData: Partial<IPricelist>) {
    return await this.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).exec();
  }
);

pricelistSchema.static(
  "toggleActiveStatus",
  async function toggleActiveStatus(id: string) {
    const pricelist = await this.findById(id);
    if (!pricelist) {
      throw new Error("Daftar harga tidak ditemukan.");
    }

    pricelist.isActive = !pricelist.isActive;
    return await pricelist.save();
  }
);

pricelistSchema.plugin(MongooseDelete, {
  deletedAt: true,
  deletedBy: true,
  overrideMethods: true,
});

const Pricelist = model<IPricelist, PricelistModel>(
  "Pricelists",
  pricelistSchema
);

export default Pricelist;
