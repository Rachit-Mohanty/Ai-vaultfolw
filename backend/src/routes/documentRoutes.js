import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";

import Document from "../models/Document.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

function validateDocumentId(req, res, next) {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid document ID." });
    }
    next();
}


// Make sure uploads folder exists
const uploadDirectory = "uploads";

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}


// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },

    filename: (req, file, cb) => {
        const uniqueName =
            `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;

        cb(null, uniqueName);
    }
});


// Allowed file types
const allowedTypes = [
    "application/pdf",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];
const allowedExtensions = {
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx"
};


// File filter
const fileFilter = (req, file, cb) => {

    const extension = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(file.mimetype) && allowedExtensions[file.mimetype] === extension) {
        cb(null, true);
    } else {
        cb(
            new Error("Only PDF, DOCX and TXT files are allowed."),
            false
        );
    }
};

async function hasExpectedFileSignature(file) {
    const handle = await fs.promises.open(file.path, "r");
    try {
        const buffer = Buffer.alloc(4);
        await handle.read(buffer, 0, 4, 0);
        if (file.mimetype === "application/pdf") return buffer.toString("ascii") === "%PDF";
        if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            return buffer[0] === 0x50 && buffer[1] === 0x4B;
        }
        return true;
    } finally {
        await handle.close();
    }
}


// Multer
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});


// ================================
// UPLOAD DOCUMENT
// POST /api/documents/upload
// ================================

router.post(
    "/upload",
    authMiddleware,
    upload.single("document"),
    async (req, res) => {

        try {

            if (!req.file) {
                return res.status(400).json({
                    message: "No document was uploaded."
                });
            }

            if (!await hasExpectedFileSignature(req.file)) {
                await fs.promises.unlink(req.file.path).catch(() => {});
                return res.status(400).json({ message: "The uploaded file does not match its declared type." });
            }


            const document = await Document.create({
                user: req.user.userId,

                originalName: req.file.originalname,

                filename: req.file.filename,

                fileType: req.file.mimetype,

                fileSize: req.file.size,

                filePath: req.file.path
            });


            res.status(201).json({
                message: "Document uploaded successfully.",
                document
            });

        } catch (error) {

            if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
            console.error("Document upload error:", error.message);

            res.status(500).json({
                message: "Failed to upload document."
            });
        }
    }
);


// ================================
// GET USER DOCUMENTS
// GET /api/documents
// ================================

router.get(
    "/",
    authMiddleware,
    async (req, res) => {

        try {

            const documents = await Document.find({
                user: req.user.userId
            }).sort({
                createdAt: -1
            });


            res.json({
                documents
            });

        } catch (error) {

            console.error("Document fetch error:", error);

            res.status(500).json({
                message: "Failed to load documents."
            });
        }
    }
);


// ================================
// DOCUMENT COUNT
// GET /api/documents/count
// ================================

// ================================
// RECENT DOCUMENTS
// GET /api/documents/recent
// ================================

router.get(
    "/recent",
    authMiddleware,
    async (req, res) => {

        try {

            const documents = await Document.find({
                user: req.user.userId
            })
            .sort({
                createdAt: -1
            })
            .limit(5)
            .select(
                "originalName fileType fileSize createdAt archived favorite"
            );

            res.json({
                documents
            });

        } catch (error) {

            console.error(
                "Recent documents error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to load recent documents."
            });
        }
    }
);

router.get(
    "/count",
    authMiddleware,
    async (req, res) => {

        try {

            const count = await Document.countDocuments({
                user:  req.user.userId,
                archived: false
            });

            res.json({
                count
            });

        } catch (error) {

            console.error("Document count error:", error);

            res.status(500).json({
                message: "Failed to load document count."
            });
        }
    }
);


// ================================
// ARCHIVED DOCUMENT COUNT
// GET /api/documents/archived-count
// ================================

router.get(
    "/archived-count",
    authMiddleware,
    async (req, res) => {

        try {

            const count = await Document.countDocuments({
                user: req.user.userId,
                archived: true
            });

            res.json({
                count
            });

        } catch (error) {

            console.error("Archived document count error:", error);

            res.status(500).json({
                message: "Failed to load archived document count."
            });
        }
    }
);

// View or download a document owned by the current user.
router.get("/:id/file", authMiddleware, validateDocumentId, async (req, res) => {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            user: req.user.userId
        });

        if (!document) {
            return res.status(404).json({ message: "Document not found." });
        }

        const filePath = path.resolve(document.filePath);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: "Document file is no longer available." });
        }

        res.type(document.fileType);
        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(document.originalName)}"`);
        res.sendFile(filePath);
    } catch (error) {
        console.error("Document view error:", error);
        res.status(500).json({ message: "Failed to open document." });
    }
});

// ================================
// TOGGLE DOCUMENT FAVORITE
// PATCH /api/documents/:id/favorite
// ================================

router.patch(
    "/:id/favorite",
    authMiddleware,
    validateDocumentId,
    async (req, res) => {
        try {
            const document = await Document.findOne({
                _id: req.params.id,
                user: req.user.userId
            });

            if (!document) {
                return res.status(404).json({
                    message: "Document not found."
                });
            }

            document.favorite = typeof req.body.favorite === "boolean"
                ? req.body.favorite
                : !document.favorite;
            await document.save();

            res.json({
                message: document.favorite
                    ? "Document added to favorites."
                    : "Document removed from favorites.",
                document
            });
        } catch (error) {
            console.error("Document favorite error:", error);
            res.status(500).json({
                message: "Failed to update document favorite."
            });
        }
    }
);

// ================================
// DELETE DOCUMENT
// DELETE /api/documents/:id
// ================================

router.delete(
    "/:id",
    authMiddleware,
    validateDocumentId,
    async (req, res) => {
        try {
            const document = await Document.findOne({
                _id: req.params.id,
                user: req.user.userId
            });

            if (!document) {
                return res.status(404).json({
                    message: "Document not found."
                });
            }

            if (document.filePath && fs.existsSync(document.filePath)) {
                fs.unlinkSync(document.filePath);
            }

            await document.deleteOne();

            res.json({
                message: "Document deleted successfully."
            });
        } catch (error) {
            console.error("Document delete error:", error);
            res.status(500).json({
                message: "Failed to delete document."
            });
        }
    }
);


export default router;
