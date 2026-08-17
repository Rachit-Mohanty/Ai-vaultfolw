
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";

const router = express.Router();
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Too many authentication attempts. Please try again in 15 minutes." }
});
const jwtOptions = {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    issuer: "vaultflow-api",
    audience: "vaultflow-client",
    algorithm: "HS256"
};

function isValidEmail(value) {
    return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function isValidPassword(value) {
    return typeof value === "string" && value.length >= 12 && value.length <= 128;
}


// =========================
// SIGNUP
// =========================
router.post("/signup", authLimiter, async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        // Check required fields
        if (typeof firstName !== "string" || typeof lastName !== "string" || !isValidEmail(email) || !isValidPassword(password)) {
    return res.status(400).json({
        message: "Use a valid email, names up to 60 characters, and a password between 12 and 128 characters."
    });
}

        // Clean input
        const cleanEmail = email.trim().toLowerCase();
        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        if (!firstName.trim() || !lastName.trim() || firstName.trim().length > 60 || lastName.trim().length > 60) {
            return res.status(400).json({ message: "Use names between 1 and 60 characters." });
        }

        // Check existing user
        const existingUser = await User.findOne({
            email: cleanEmail
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Unable to create an account with those details."
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await User.create({
    name: fullName,
    email: cleanEmail,
    password: hashedPassword,
    profilePicture: ""
});

        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            jwtOptions
        );

        res.status(201).json({
            message: "Account created successfully.",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture
            }
        });

    } catch (error) {
        console.error("Signup error:", error);

        res.status(500).json({
            message: "Server error during signup."
        });
    }
});


// =========================
// LOGIN
// =========================
router.post("/login", authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check required fields
        if (!isValidEmail(email) || typeof password !== "string" || password.length > 128) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        // Find user
        const user = await User.findOne({
            email: cleanEmail
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        // Compare password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        // Create JWT
const token = jwt.sign(
    {
        userId: user._id,
        email: user.email
    },
    process.env.JWT_SECRET,
    jwtOptions
);
        res.status(200).json({
            message: "Login successful.",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture || ""
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            message: "Server error during login."
        });
    }
});


export default router;

