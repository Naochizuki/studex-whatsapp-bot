import { Schema, Model, model } from "mongoose";
import MongooseDelete, { type SoftDeleteDocument } from "mongoose-delete";

interface TRating extends SoftDeleteDocument {
  rating: 0 | 1 | 2 | 3 | 4 | 5;
  userId: Schema.Types.ObjectId;
  serviceId: Schema.Types.ObjectId;
  media: { [key: string]: any };
  review: string;
  isActive: boolean;
}

export interface IRating extends TRating {
  getRatings(
    page: number,
    limit: number,
    searchQuery: string,
    ratingFilter: number,
    serviceId: string,
    filter: Partial<IRating>
  ): any;
  updateMedia(id: string, media: any): any;
  toggleActiveStatus(id: string): any;
}

interface RatingModel extends Model<IRating> {
  getRatings(
    page: number,
    limit: number,
    searchQuery: string,
    ratingFilter: number,
    serviceId: string,
    filter: Partial<IRating>
  ): any;
  updateMedia(id: string, media: any): any;
  toggleActiveStatus(id: string): any;
}

const ratingSchema: Schema<IRating> = new Schema(
  {
    rating: {
      type: Number,
      required: [true, "Rating diperlukan."],
      max: [5, "Rating maksimal adalah 5."],
      min: [0, "Rating minimal adalah 0"],
      default: 5,
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: [true, "ID pengguna diperlukan"],
      ref: "Users",
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Services",
      required: [true, "ID layanan diperlukan."],
    },
    media: {
      type: Map,
      of: Schema.Types.Mixed,
      required: false,
      default: {},
    },
    review: {
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

ratingSchema.static(
  "getRatings",
  async function getRatings(
    page: number = 1,
    limit: number = 10,
    searchQuery: string = "",
    ratingFilter?: number,
    serviceId?: string,
    filter: Partial<IRating> = { isActive: true }
  ) {
    const skip = (page - 1) * limit;
    const query: any = {
      ...filter,
      $or: [{ review: { $regex: searchQuery, $options: "i" } }],
    };

    if (ratingFilter !== undefined) {
      query.rating = ratingFilter;
    }

    if (serviceId) {
      query.serviceId = serviceId;
    }

    const ratings = await this.find(query)
      .populate("userId", "name username email")
      .populate("serviceId", "fullname shortname tag")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    const total = await this.countDocuments(query);
    return {
      data: ratings,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }
);

ratingSchema.static(
  "updateMedia",
  async function updateMedia(id: string, media: any) {
    return await this.findByIdAndUpdate(
      id,
      { media },
      { new: true, runValidators: true }
    ).exec();
  }
);

ratingSchema.static(
  "toggleActiveStatus",
  async function toggleActiveStatus(id: string) {
    const rating = await this.findById(id);
    if (!rating) {
      throw new Error("Ulasan tidak ditemukan.");
    }

    rating.isActive = !rating.isActive;
    return await rating.save();
  }
);

ratingSchema.plugin(MongooseDelete, {
  deletedAt: true,
  deletedBy: true,
  overrideMethods: true,
});

const Rating = model<IRating, RatingModel>("Ratings", ratingSchema);

export default Rating;
