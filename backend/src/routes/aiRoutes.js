import express from "express";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import Document from "../models/Document.js";
import Note from "../models/Note.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { extractDocumentText } from "../services/documentText.js";

const router = express.Router();

const actionInstructions = {
    ask: "Answer the user's question accurately using only the supplied document or selected passage. If the answer is not in the context, say so.",
    summarize: "Create a concise summary, key points, important terms, and a section-by-section outline where sections are identifiable.",
    explain: "Explain the selected passage in clear, beginner-friendly language. Include one concrete example.",
    simplify: "Rewrite and explain the selected passage in very simple language. Preserve the important meaning.",
    example: "Explain the selected passage, then provide a practical example that makes it easier to understand.",
    quiz: "Generate multiple-choice and short-answer questions, followed by an answer key.",
    flashcards: "Generate clear study flashcards in the format: Q: ... / A: ..."
};

function topicTitle(action, documentName, question) {
    const labels = { ask: "Answer", summarize: "Summary", explain: "Explanation", simplify: "Simplified", example: "Example", quiz: "Quiz", flashcards: "Flashcards" };
    const questionSuffix = action === "ask" && question ? ` — ${question.slice(0, 60)}` : "";
    return `${labels[action]}: ${documentName}${questionSuffix}`.slice(0, 180);
}

const ollamaBaseUrl = () => (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");

function normalizeOllamaOutput(output) {
    return String(output || "")
        .split("\n")
        .map(line => line.replace(/^\s{0,3}#{1,6}\s*/, "").replace(/\*\*(.*?)\*\*/g, "$1"))
        .join("\n")
        .replace(/`([^`]+)`/g, "$1")
        .trim();
}

async function resolveOllamaModel() {
    const response = await fetch(`${ollamaBaseUrl()}/api/tags`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "Ollama models could not be listed.");
    }

    const installedModels = data.models || [];
    if (installedModels.length === 0) {
        const noModelsError = new Error("No Ollama models are installed. Run `ollama pull llama3.2` (or another model) and try again.");
        noModelsError.status = 503;
        throw noModelsError;
    }

    const configuredModel = process.env.OLLAMA_MODEL;
    const configuredModelIsInstalled = installedModels.some(model =>
        model.name === configuredModel || model.model === configuredModel
    );

    return configuredModel && configuredModelIsInstalled
        ? configuredModel
        : (installedModels[0].name || installedModels[0].model);
}

async function generateWithOllama({ prompt, documentPath, document }) {
    const documentText = await extractDocumentText(documentPath, document.fileType);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.OLLAMA_TIMEOUT_MS) || 120_000);

    try {
        const model = await resolveOllamaModel();
        const response = await fetch(`${ollamaBaseUrl()}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
                model,
                stream: false,
                prompt: `${prompt}\n\nDocument name: ${document.originalName}\n\nDocument text:\n${documentText}`
            })
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || "Ollama could not process this document.");
        }

        return normalizeOllamaOutput(data.response);
    } catch (error) {
        if (error.name === "AbortError") {
            const timeoutError = new Error("Ollama took too long to respond. Try a smaller document or increase OLLAMA_TIMEOUT_MS.");
            timeoutError.status = 504;
            throw timeoutError;
        }
        if (error.cause?.code === "ECONNREFUSED") {
            const unavailableError = new Error(`Ollama is not running at ${ollamaBaseUrl()}. Start Ollama and make sure the selected model is installed.`);
            unavailableError.status = 503;
            throw unavailableError;
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

router.post("/document/:id", authMiddleware, async (req, res) => {
    try {
        const { action = "ask", question = "", selectedText = "", questionCount = 10 } = req.body;
        const instruction = actionInstructions[action];
        if (!instruction) return res.status(400).json({ message: "Unsupported AI action." });
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid document ID." });
        if (typeof question !== "string" || typeof selectedText !== "string" || question.length > 4_000 || selectedText.length > 50_000) {
            return res.status(400).json({ message: "The question or selected text is too large." });
        }

        const document = await Document.findOne({ _id: req.params.id, user: req.user.userId });
        if (!document) return res.status(404).json({ message: "Document not found." });

        const documentPath = path.resolve(document.filePath);
        if (!fs.existsSync(documentPath)) return res.status(404).json({ message: "The uploaded file is no longer available." });

        const passage = selectedText.trim();
        const prompt = [
            instruction,
            "Write in plain, simple language. Do not use Markdown, heading markers such as # or ##, tables, or decorative formatting.",
            passage ? `Selected passage (give this priority):\n${passage}` : "Use the entire uploaded document as context.",
            question.trim() ? `User request: ${question.trim()}` : "",
            action === "quiz" ? `Generate ${Math.min(Math.max(Number(questionCount) || 10, 1), 25)} questions.` : ""
        ].filter(Boolean).join("\n\n");

        const answer = await generateWithOllama({ prompt, documentPath, document });
        const topic = await Note.create({
            user: req.user.userId,
            title: topicTitle(action, document.originalName, question.trim()),
            content: answer || "I couldn't generate a response for this request.",
            synthesized: true
        });
        res.json({ answer: topic.content, topic: { id: topic._id, title: topic.title, createdAt: topic.createdAt }, document: { id: document._id, name: document.originalName } });
    } catch (error) {
        console.error("AI document request error:", error);
        const status = Number(error.status) || 500;
        const message = error.message || "AI request failed. Please try again.";
        res.status(status >= 400 && status < 600 ? status : 500).json({
            message: `AI request failed: ${message}`
        });
    }
});

export default router;
