import fs from "fs/promises";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

const MAX_DOCUMENT_CHARACTERS = Number(process.env.OLLAMA_DOCUMENT_MAX_CHARS) || 60_000;

export async function extractDocumentText(documentPath, fileType) {
    let text;

    if (fileType === "text/plain") {
        text = await fs.readFile(documentPath, "utf8");
    } else if (fileType === "application/pdf") {
        const data = await fs.readFile(documentPath);
        const parser = new PDFParse({ data });
        try {
            ({ text } = await parser.getText());
        } finally {
            await parser.destroy();
        }
    } else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        ({ value: text } = await mammoth.extractRawText({ path: documentPath }));
    } else {
        throw new Error("This document type cannot be read by Ollama.");
    }

    const normalizedText = String(text || "").replace(/\r\n/g, "\n").trim();
    if (!normalizedText) {
        throw new Error("No readable text was found in this document.");
    }

    return normalizedText.slice(0, MAX_DOCUMENT_CHARACTERS);
}
