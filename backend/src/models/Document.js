import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        originalName: {
            type: String,
            required: true,
            trim: true
        },

        filename: {
            type: String,
            required: true
        },

        fileType: {
            type: String,
            required: true
        },

        fileSize: {
            type: Number,
            required: true
        },

        filePath: {
            type: String,
            required: true
        },

        archived: {
    type: Boolean,
    default: false   
},

        favorite: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Document", documentSchema);