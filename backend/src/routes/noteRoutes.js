
import express from "express";
import mongoose from "mongoose";
import Note from "../models/Note.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// GET active notes count
router.get("/count", authMiddleware, async (req, res) => {
    try {

        const userId = req.user.userId;

        const count = await Note.countDocuments({
            user: userId,
            archived: false
        });

        res.json({
            count: count
        });

    } catch (error) {

        console.error("Active notes count error:", error);

        res.status(500).json({
            message: "Failed to get active notes count"
        });
    }
});


// GET archived notes count
router.get("/archived-count", authMiddleware, async (req, res) => {
    try {

        const userId = req.user.userId;

        const count = await Note.countDocuments({
            user: userId,
            archived: true
        });

        res.json({
            count: count
        });

    } catch (error) {

        console.error("Archived notes count error:", error);

        res.status(500).json({
            message: "Failed to get archived notes count"
        });
    }
});


// GET synthesized topics count
router.get("/synthesized-count", authMiddleware, async (req, res) => {
    try {

        const userId = req.user.userId;

        const count = await Note.countDocuments({
            user: userId,
            synthesized: true
        });

        res.json({
            count: count
        });

    } catch (error) {

        console.error("Synthesized topics count error:", error);

        res.status(500).json({
            message: "Failed to get synthesized topics count"
        });
    }

    });

// GET recent knowledge
router.get("/recent", authMiddleware, async (req, res) => {
    try {

        const userId = req.user.userId;

        const notes = await Note.find({
            user: userId,
            synthesized: true
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("title content createdAt archived synthesized");

        res.json({
            notes: notes
        });

    } catch (error) {

        console.error("Recent knowledge error:", error);

        res.status(500).json({
            message: "Failed to get recent knowledge"
        });
    }
});

// GET stored AI outputs for Synthesized Topics
router.get("/", authMiddleware, async (req, res) => {
    try {

        const userId = req.user.userId;

        const notes = await Note.find({
            user: userId,
            synthesized: true
        })
        .sort({ createdAt: -1 })
        .select("title content createdAt archived favorite synthesized");

        res.json({
            notes: notes
        });

    } catch (error) {

        console.error("Synthesized topics error:", error);

        res.status(500).json({
            message: "Failed to load synthesized topics"
        });

    }
});

router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid synthesized topic ID." });
        }
        const note = await Note.findOneAndDelete({
            _id: req.params.id,
            user: req.user.userId,
            synthesized: true
        });

        if (!note) return res.status(404).json({ message: "Synthesized topic not found." });
        res.json({ message: "Synthesized topic deleted." });
    } catch (error) {
        console.error("Synthesized topic delete error:", error);
        res.status(500).json({ message: "Failed to delete synthesized topic." });
    }
});

export default router;

