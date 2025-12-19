import { Router } from "express";
import multer from "multer";
import Tesseract from "tesseract.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/vision/ocr
 * Accepts an image and returns extracted text
 */
router.post("/ocr", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const result = await Tesseract.recognize(
      req.file.buffer,
      "eng",
      { logger: () => {} }
    );

    const text = result?.data?.text || "";

    res.json({ text });
  } catch (err) {
    console.error("OCR error:", err);
    res.status(500).json({ error: "OCR failed" });
  }
});

export default router;
