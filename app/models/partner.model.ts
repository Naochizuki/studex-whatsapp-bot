import { Schema, Model, model } from "mongoose";
import MongooseDelete, { type SoftDeleteDocument } from "mongoose-delete";

interface Services {
  serviceId: Schema.Types.ObjectId | any;
  pricelistId: Schema.Types.ObjectId | null | any;
}

interface TPartner extends SoftDeleteDocument {
  userId: Schema.Types.ObjectId | null | any;
  services: Services[];
  rating: { [key: string | number]: any };
  motorcycle: string;
  policeNumber: string;
  isReady: boolean;
  reason: string;
  state: string;
  isActive: boolean;
}

export interface IPartner extends TPartner {
  createdAt: Date | string;
  updatedAt: Date | string;
  findByService(serviceId: string): any;
  findReadyPartners(): any;
}

interface PartnerModel extends Model<IPartner> {
  findByService(serviceId: string): any;
  findReadyPartners(): any;
}

const partnerSchema: Schema<IPartner> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: "Users",
    },
    services: [
      {
        serviceId: {
          type: Schema.Types.ObjectId,
          required: false,
          ref: "Services",
        },
        pricelistId: {
          type: Schema.Types.ObjectId,
          required: false,
          default: null,
          ref: "Pricelists",
        },
      },
    ],
    rating: {
      type: Map,
      of: Schema.Types.Mixed,
    },
    motorcycle: {
      type: String,
      required: false,
    },
    policeNumber: {
      type: String,
      required: false,
    },
    isReady: {
      type: Boolean,
      required: true,
      default: false,
    },
    reason: {
      type: String,
      required: false,
    },
    state: {
      type: String,
      enum: [
        "askPartner",
        "askNumber",
        "askService",
        "askMotorcycle",
        "askPoliceNumber",
        "finished",
      ],
      required: true,
      default: "askPartner",
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

partnerSchema.static(
  "findByService",
  async function findByService(serviceId: string) {
    return await this.find({ "services.serviceId": serviceId, isActive: true });
  }
);

partnerSchema.static("findReadyPartners", async function findReadyPartners() {
  return await this.find({ isReady: true, isActive: true });
});

partnerSchema.method(
  "calculateAverageRating",
  function calculateAverageRating() {
    const ratings: any[] = Object.values(this.rating);
    if (ratings.length === 0) return 0;

    const total = ratings.reduce((sum, rating) => sum + rating, 0);
    return total / ratings.length;
  }
);

partnerSchema.methods.calculateTotalRatingPerService = function () {
  const totalRatingPerService: { [key: string]: number } = {};

  this.services.forEach((service: any, key: string) => {
    let totalRating = 0;
    let ratingCount = 0;

    this.rating.forEach((rating: any) => {
      if (rating.serviceId === service.serviceId) {
        totalRating += rating.value;
        ratingCount += 1;
      }
    });

    totalRatingPerService[service.serviceId] =
      ratingCount > 0 ? totalRating : 0;
  });

  return totalRatingPerService;
};

partnerSchema.plugin(MongooseDelete, {
  deletedAt: true,
  deletedBy: true,
  overrideMethods: true,
});

const Partner = model<IPartner, PartnerModel>("Partners", partnerSchema);

export default Partner;
