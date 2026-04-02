require("dotenv").config();
const express = require("express");
const cors = require("cors");
const https = require("https");
const path = require("path"); // ✅ AJOUT

const app = express();

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());

// ✅ SERVIR LE FRONTEND (IMPORTANT)
app.use(express.static(path.join(__dirname)));

// ================= ROUTE PRINCIPALE =================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ================= STABLE HORDE =================
const HORDE_KEY = process.env.STABLE_HORDE_KEY || "0000000000";

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function hordeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data) });
        } catch (e) {
          reject(new Error("Parse error: " + data.slice(0, 100)));
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function generateWithHorde(prompt) {
  const submitBody = JSON.stringify({
    prompt: prompt,
    params: {
      steps: 20,
      width: 512,
      height: 512,
      n: 1,
      sampler_name: "k_euler",
      cfg_scale: 7,
    },
    models: ["Deliberate"],
    r2: false,
    nsfw: false,
    censor_nsfw: true,
  });

  const submitRes = await hordeRequest({
    hostname: "stablehorde.net",
    path: "/api/v2/generate/async",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": HORDE_KEY,
      "Client-Agent": "ai-image-generator:1.0",
      "Content-Length": Buffer.byteLength(submitBody),
    },
  }, submitBody);

  if (!submitRes.json.id) {
    throw new Error("Horde submit failed");
  }

  const jobId = submitRes.json.id;
  console.log("Horde job ID:", jobId);

  for (let attempt = 0; attempt < 36; attempt++) {
    await sleep(5000);

    const checkRes = await hordeRequest({
      hostname: "stablehorde.net",
      path: `/api/v2/generate/check/${jobId}`,
      method: "GET",
      headers: {
        "apikey": HORDE_KEY,
        "Client-Agent": "ai-image-generator:1.0"
      },
    });

    const check = checkRes.json;

    if (check.done) {
      const statusRes = await hordeRequest({
        hostname: "stablehorde.net",
        path: `/api/v2/generate/status/${jobId}`,
        method: "GET",
        headers: {
          "apikey": HORDE_KEY,
          "Client-Agent": "ai-image-generator:1.0"
        },
      });

      const generations = statusRes.json.generations;
      if (!generations || generations.length === 0) {
        throw new Error("Pas d’image générée");
      }

      const imgBase64 = generations[0].img;
      const buffer = Buffer.from(imgBase64, "base64");

      return { buffer, mimeType: "image/webp" };
    }

    if (check.faulted) {
      throw new Error("Horde job faulted");
    }
  }

  throw new Error("Timeout Stable Horde");
}

// ================= ROUTE API =================
app.post("/generate", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt requis" });
  }

  console.log("\nPrompt:", prompt);

  try {
    const result = await generateWithHorde(prompt);

    res.setHeader("Content-Type", result.mimeType);
    return res.send(result.buffer);

  } catch (err) {
    console.log("❌ Erreur:", err.message);
    return res.status(502).json({ error: err.message });
  }
});

// ================= SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});