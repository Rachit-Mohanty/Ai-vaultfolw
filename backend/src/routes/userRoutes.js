
import express from "express";
import bcrypt from "bcrypt";
import fs from "fs/promises";
import path from "path";
import User from "../models/User.js";
import Document from "../models/Document.js";
import Note from "../models/Note.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

function isValidPassword(value) {
    return typeof value === "string" && value.length >= 12 && value.length <= 128;
}

function isValidProfilePicture(value) {
    return value === "" || (typeof value === "string" && value.length <= 500_000 && /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value));
}


// =====================================================
// GET CURRENTLY LOGGED-IN USER
// =====================================================
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture || ""
            }
        });

    } catch (error) {
        console.error("Get user error:", error);

        res.status(500).json({
            message: "Server error while fetching user."
        });
    }
});


// =====================================================
// UPDATE USER PROFILE
// =====================================================
router.put("/me", authMiddleware, async (req, res) => {
    try {
        const { name, profilePicture } = req.body;

        if (typeof name !== "string" || !name.trim() || name.trim().length > 120) {
            return res.status(400).json({
                message: "Name is required."
            });
        }

        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        user.name = name.trim();

        if (!isValidProfilePicture(profilePicture)) {
            return res.status(400).json({ message: "Profile pictures must be PNG, JPEG, or WebP images under 500 KB." });
        }

        if (typeof profilePicture === "string") {
            user.profilePicture = profilePicture;
        }

        await user.save();

        res.status(200).json({
            message: "Profile updated successfully.",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture || ""
            }
        });

    } catch (error) {
        console.error("Update profile error:", error);

        res.status(500).json({
            message: "Server error while updating profile."
        });
    }
});


// =====================================================
// CHANGE PASSWORD
// =====================================================
router.put("/change-password", authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Check required fields
        if (typeof currentPassword !== "string" || currentPassword.length > 128 || !isValidPassword(newPassword)) {
            return res.status(400).json({
                message: "Provide your current password and a new password between 12 and 128 characters."
            });
        }

        // Find logged-in user
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        // Check current password
        const passwordMatch = await bcrypt.compare(
            currentPassword,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Current password is incorrect."
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;

        await user.save();

        res.status(200).json({
            message: "Password updated successfully."
        });

    } catch (error) {
        console.error("Change password error:", error);

        res.status(500).json({
            message: "Server error while changing password."
        });
    }
});


// =====================================================
// DELETE ACCOUNT
// =====================================================
router.delete("/delete", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        const documents = await Document.find({ user: req.user.userId }).select("filePath").lean();
        const uploadsDirectory = path.resolve("uploads");
        await Promise.all(documents.map(async document => {
            const documentPath = path.resolve(document.filePath);
            if (documentPath.startsWith(`${uploadsDirectory}${path.sep}`)) {
                await fs.unlink(documentPath).catch(() => {});
            }
        }));
        await Promise.all([
            Document.deleteMany({ user: req.user.userId }),
            Note.deleteMany({ user: req.user.userId }),
            User.findByIdAndDelete(req.user.userId)
        ]);

        res.status(200).json({
            message: "Account deleted successfully."
        });

    } catch (error) {
        console.error("Delete account error:", error);

        res.status(500).json({
            message: "Server error while deleting account."
        });
    }
});


export default router;

