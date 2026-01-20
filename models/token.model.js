import mongoose from "mongoose";

const TokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    token: {
      type: String,
      required: true,
      index: true,
    },

    tokenType: {
      type: String,
      enum: ["EMAIL_VERIFICATION", "PASSWORD_RESET", "REFRESH_TOKEN", "INVITATION"],
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for efficient querying
TokenSchema.index({ token: 1, tokenType: 1, isUsed: 1 });

// Automatically delete expired tokens (optional)
TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Token", TokenSchema);
