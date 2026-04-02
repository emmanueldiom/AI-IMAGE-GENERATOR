require("dotenv").config();
const express = require("express");
const cors = require("cors");
const https = require("https");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("🚀 AI Image Generator API is running"));

// ================= STABLE HORDE =================
// Gratuit, illimité, sans compte — clé anonyme "0000000000"
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
        try { resolve({ status: res.statusCode, json: JSON.parse(data) }); }
        catch (e) { reject(new Error("Parse error: " + data.slice(0, 100))); }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function generateWithHorde(prompt) {
  // Étape 1 — Soumettre la requête
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
    throw new Error("Horde submit failed: " + JSON.stringify(submitRes.json).slice(0, 100));
  }

  const jobId = submitRes.json.id;
  console.log("Horde job ID:", jobId);

  // Étape 2 — Polling jusqu'au résultat (max 3 minutes)
  for (let attempt = 0; attempt < 36; attempt++) {
    await sleep(5000);

    const checkRes = await hordeRequest({
      hostname: "stablehorde.net",
      path: `/api/v2/generate/check/${jobId}`,
      method: "GET",
      headers: { "apikey": HORDE_KEY, "Client-Agent": "ai-image-generator:1.0" },
    });

    const check = checkRes.json;
    console.log(`Horde status — done: ${check.done}, queue: ${check.queue_position}, wait: ${check.wait_time}s`);

    if (check.done) {
      // Étape 3 — Récupérer le résultat
      const statusRes = await hordeRequest({
        hostname: "stablehorde.net",
        path: `/api/v2/generate/status/${jobId}`,
        method: "GET",
        headers: { "apikey": HORDE_KEY, "Client-Agent": "ai-image-generator:1.0" },
      });

      const generations = statusRes.json.generations;
      if (!generations || generations.length === 0) {
        throw new Error("Pas de génération dans la réponse Horde");
      }

      // L image est en base64
      const imgBase64 = generations[0].img;
      const buffer = Buffer.from(imgBase64, "base64");
      return { buffer, mimeType: "image/webp" };
    }

    if (check.faulted) {
      throw new Error("Horde job faulted");
    }
  }

  throw new Error("Horde timeout — trop long, réessaie");
}

// ================= ROUTE =================
app.post("/generate", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt requis" });

  console.log("\nPrompt:", prompt);
  console.log("⏳ Envoi à Stable Horde... (peut prendre 1-3 min)");

  try {
    const result = await generateWithHorde(prompt);
    console.log("✅ Stable Horde OK");
    res.setHeader("Content-Type", result.mimeType);
    return res.send(result.buffer);
  } catch (err) {
    console.log("❌ Horde failed:", err.message);
    return res.status(502).json({ error: "Erreur Stable Horde: " + err.message });
  }
});

app.listen(3000, () => console.log("🚀 Serveur démarré sur http://localhost:3000"));
