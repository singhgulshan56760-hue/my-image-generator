import express from "express";
import dotenv from "dotenv";
import multer from "multer";

dotenv.config();

const app = express();

// Render के लिए PORT
const PORT = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

app.use(express.static("public"));

app.post("/api/generate", upload.single("image"), async (req, res) => {
  try {
    const prompt = req.body?.prompt;

    if (!prompt) {
      return res.status(400).json({
        error: "Please enter a prompt."
      });
    }

    const apiKey = process.env.POLLINATIONS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "API key is missing in environment variables."
      });
    }

    // IMAGE EDIT MODE
    if (req.file) {
      const formData = new FormData();

      const imageBlob = new Blob(
        [req.file.buffer],
        { type: req.file.mimetype }
      );

      formData.append(
        "image",
        imageBlob,
        req.file.originalname
      );

      formData.append("prompt", prompt);

      formData.append(
        "model",
        "black-forest-labs/flux.1-kontext-pro"
      );

      const response = await fetch(
        "https://gen.pollinations.ai/v1/images/edits",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        const errorText = await response.text();

        console.error(
          "Pollinations edit error:",
          errorText
        );

        return res.status(response.status).json({
          error: "Image editing failed: " + errorText
        });
      }

      const result = await response.json();

      const imageData = result?.data?.[0]?.b64_json;

      if (!imageData) {
        return res.status(500).json({
          error: "Edited image was not returned by the API."
        });
      }

      return res.json({
        image: `data:image/png;base64,${imageData}`
      });
    }

    // TEXT TO IMAGE MODE
    const imageUrl =
      "https://gen.pollinations.ai/image/" +
      encodeURIComponent(prompt) +
      "?model=flux&width=1024&height=1024";

    const response = await fetch(imageUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "Pollinations generation error:",
        errorText
      );

      return res.status(response.status).json({
        error: "Image generation failed: " + errorText
      });
    }

    const contentType =
      response.headers.get("content-type") ||
      "image/jpeg";

    const imageBuffer =
      Buffer.from(await response.arrayBuffer());

    const base64 =
      imageBuffer.toString("base64");

    return res.json({
      image: `data:${contentType};base64,${base64}`
    });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      error: error.message || "Image generation failed."
    });
  }
});

// Server start
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `🚀 My AI Image Generator running on port ${PORT}`
  );
});