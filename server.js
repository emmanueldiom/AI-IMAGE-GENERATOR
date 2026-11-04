require("dotenv").config();
const express = require("express");
const https = require("https");
const path = require("path");

const app = express();

// ================= MIDDLEWARE =================
// Pas de CORS : l'interface est servie par ce même serveur.
// Ouvrir CORS permettrait à n'importe quel site d'utiliser notre quota Stable Horde.
app.use(express.json({ limit: "10kb" }));

// Seul le dossier public/ est servi (et non server.js, package.json, etc.).
app.use(express.static(path.join(__dirname, "public")));

// ================= STABLE HORDE =================
const HORDE_KEY = process.env.STABLE_HORDE_KEY || "0000000000"; // clé anonyme par défaut
const CLIENT_AGENT = "ai-image-generator:1.1:github.com/emmanueldiom";
const POLL_INTERVAL_MS = 5000;
const MAX_ATTEMPTS = 36; // 36 × 5 s = 3 minutes
const MAX_PROMPT_LENGTH = 500;

// Formats proposés dans l'interface → dimensions (multiples de 64, ≤ 512 × 512 pixels
// pour rester dans les limites gratuites de Stable Horde).
const RATIOS = {
  "1/1": { width: 512, height: 512 },
  "16/9": { width: 640, height: 384 },
  "9/16": { width: 384, height: 640 },
};

// Modèles proposés dans l'interface. "auto" laisse Stable Horde choisir
// un modèle disponible : c'est souvent le plus rapide.
const MODELS = {
  auto: null,
  deliberate: ["Deliberate"],
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function hordeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data) });
        } catch (e) {
          reject(new Error("Réponse illisible de Stable Horde"));
        }
      });
    });
    req.setTimeout(30000, () => req.destroy(new Error("Stable Horde ne répond pas")));
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

const hordeHeaders = { apikey: HORDE_KEY, "Client-Agent": CLIENT_AGENT };

async function generateWithHorde(prompt, { width, height }, models) {
  const submitBody = JSON.stringify({
    prompt,
    params: { steps: 20, width, height, n: 1, sampler_name: "k_euler", cfg_scale: 7 },
    ...(models ? { models } : {}),
    r2: false,
    nsfw: false,
    censor_nsfw: true,
  });

  const submitRes = await hordeRequest(
    {
      hostname: "stablehorde.net",
      path: "/api/v2/generate/async",
      method: "POST",
      headers: {
        ...hordeHeaders,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(submitBody),
      },
    },
    submitBody,
  );

  if (submitRes.status === 429) {
    throw new Error("Trop de demandes en cours. Patientez une minute puis réessayez.");
  }
  if (!submitRes.json.id) {
    throw new Error(submitRes.json.message || "Stable Horde a refusé la demande.");
  }

  const jobId = submitRes.json.id;
  console.log("Horde job ID:", jobId);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS);

    const check = (
      await hordeRequest({
        hostname: "stablehorde.net",
        path: `/api/v2/generate/check/${jobId}`,
        method: "GET",
        headers: hordeHeaders,
      })
    ).json;

    if (check.faulted) {
      throw new Error("La génération a échoué côté Stable Horde. Réessayez.");
    }
    if (check.is_possible === false) {
      throw new Error("Aucun serveur disponible pour ce modèle. Choisissez « Automatique ».");
    }

    if (check.done) {
      const statusRes = await hordeRequest({
        hostname: "stablehorde.net",
        path: `/api/v2/generate/status/${jobId}`,
        method: "GET",
        headers: hordeHeaders,
      });

      const generations = statusRes.json.generations;
      if (!generations || generations.length === 0) {
        throw new Error("Aucune image n'a été générée.");
      }
      return { buffer: Buffer.from(generations[0].img, "base64"), mimeType: "image/webp" };
    }
  }

  throw new Error("La file d'attente est trop longue (plus de 3 minutes). Réessayez plus tard.");
}

// ================= ROUTE API =================
app.post("/generate", async (req, res) => {
  const { prompt, ratio = "1/1", model = "auto" } = req.body ?? {};

  if (typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "Écrivez une description de l'image." });
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return res.status(400).json({ error: `La description ne doit pas dépasser ${MAX_PROMPT_LENGTH} caractères.` });
  }
  if (!Object.hasOwn(RATIOS, ratio)) {
    return res.status(400).json({ error: "Format d'image inconnu." });
  }
  if (!Object.hasOwn(MODELS, model)) {
    return res.status(400).json({ error: "Modèle inconnu." });
  }

  console.log(`\nPrompt: ${prompt.trim()} | ${ratio} | ${model}`);

  try {
    const result = await generateWithHorde(prompt.trim(), RATIOS[ratio], MODELS[model]);
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
