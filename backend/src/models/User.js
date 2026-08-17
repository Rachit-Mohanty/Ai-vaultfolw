
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
    type: String,
    default: "",
    trim: true
},

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true
        },

        profilePicture: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

const User = mongoose.model("User", userSchema);

export default User;

