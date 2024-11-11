import { Schema, Model, model } from "mongoose";
import MongooseDelete, { type SoftDeleteDocument } from "mongoose-delete";

interface TOrder extends SoftDeleteDocument {
  userId: Schema.Types.ObjectId | null;
  partnerId: Schema.Types.ObjectId | null;
  custNumber: string;
  serviceId: Schema.Types.ObjectId | null;
  time: Date;
  status: string;
  note: string;
  isActive: boolean;
}

export interface IOrder extends TOrder {}

interface OrderModel extends Model<IOrder> {}

const orderSchema: Schema<IOrder> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: false,
      default: null,
      ref: "Users",
    },
    partnerId: {
      type: Schema.Types.ObjectId,
      required: false,
      default: null,
      ref: "Partners",
    },
    custNumber: {
      type: String,
      required: false,
      default: null,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      required: false,
      default: null,
      ref: "Services",
    },
    time: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      required: true,
      default: "Sedang Pesan",
      enum: [
        "Sedang Pesan",
        "Dapat Driver",
        "Sedang Dikerjakan",
        "Selesai",
        "Tidak Dapat Driver",
      ],
    },
    note: {
      type: String,
      required: false,
      default: "",
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

orderSchema.plugin(MongooseDelete, {
  deletedAt: true,
  deletedBy: true,
  overrideMethods: true,
});

const Order = model<IOrder, OrderModel>("Orders", orderSchema);

export default Order;
