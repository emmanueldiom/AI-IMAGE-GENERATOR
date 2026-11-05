const themeToggle = document.querySelector(".theme-toggle");
const promptInput = document.querySelector(".prompt-input");
const promptForm = document.querySelector(".prompt-form");
const promptBtn = document.querySelector(".prompt-btn");
const generateBtn = document.querySelector(".generate-btn");
const modelSelect = document.getElementById("model-select");
const countSelect = document.getElementById("count-select");
const ratioSelect = document.getElementById("ratio-select");
const gridGallery = document.querySelector(".gallery-grid");

const examplePrompts = [
  "Une forêt magique avec des plantes lumineuses",
  "Un dragon dans une grotte en cristal",
  "Une ville futuriste cyberpunk",
  "Un royaume sous-marin en corail",
];

// ================= THEME =================
(() => {
  const isDark = localStorage.getItem("theme") === "dark";
  document.body.classList.toggle("dark-theme", isDark);
  themeToggle.querySelector("i").className = isDark
    ? "fa-solid fa-sun"
    : "fa-solid fa-moon";
})();

themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark-theme");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  themeToggle.querySelector("i").className = isDark
    ? "fa-solid fa-sun"
    : "fa-solid fa-moon";
});

// ================= IMAGE CARD =================
const createLoadingCard = (index, ratio) => {
  const card = document.createElement("div");
  card.className = "img-card loading";
  card.id = `img-card-${index}`;
  card.style.aspectRatio = ratio; // la carte prend la forme de l'image attendue
  card.innerHTML = `
    <div class="status-container">
        <div class="spinner"></div>
        <p class="status-text">Génération en cours...<br><small>Peut prendre 1 à 3 min</small></p>
    </div>
  `;
  return card;
};

const updateImageCard = (index, imgUrl, prompt) => {
  const card = document.getElementById(`img-card-${index}`);
  if (!card) return;

  card.classList.remove("loading");
  card.innerHTML = `
    <img class="result-img">
    <div class="img-overlay">
        <a class="img-download-btn" aria-label="Télécharger l'image">
            <i class="fa-solid fa-download"></i>
        </a>
    </div>
  `;
  const img = card.querySelector(".result-img");
  img.src = imgUrl;
  img.alt = prompt; // texte saisi par l'utilisateur : affecté en propriété, jamais en HTML
  const link = card.querySelector(".img-download-btn");
  link.href = imgUrl;
  link.download = `image-${Date.now()}.webp`; // Stable Horde renvoie du WebP
};

const showErrorOnCard = (index, message) => {
  const card = document.getElementById(`img-card-${index}`);
  if (!card) return;

  card.classList.remove("loading");
  card.classList.add("error");
  card.innerHTML = `
    <div class="status-container">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <p class="status-text"></p>
    </div>
  `;
  // Message affiché comme texte : il ne peut pas injecter de HTML.
  card.querySelector(".status-text").textContent = message;
};

// Lit le message d'erreur du serveur, même si la réponse n'est pas du JSON
// (par exemple une page d'erreur de l'hébergeur).
const readError = async (response) => {
  try {
    const body = await response.json();
    return body.error || `Erreur serveur (${response.status})`;
  } catch {
    return `Erreur serveur (${response.status}). Réessayez dans un instant.`;
  }
};

// ================= GENERATE =================
const generateImages = async ({ count, prompt, ratio, model }) => {
  generateBtn.disabled = true;
  gridGallery.replaceChildren(
    ...Array.from({ length: count }, (_, i) => createLoadingCard(i, ratio)),
  );

  // Génération une image après l'autre, pour ménager la file d'attente gratuite.
  for (let i = 0; i < count; i++) {
    try {
      const response = await fetch("/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, ratio, model }),
      });

      if (!response.ok) throw new Error(await readError(response));

      const blob = await response.blob();
      updateImageCard(i, URL.createObjectURL(blob), prompt);
    } catch (error) {
      const message =
        error instanceof TypeError
          ? "Connexion au serveur impossible. Vérifiez votre connexion."
          : error.message;
      console.error("Erreur image", i, ":", message);
      showErrorOnCard(i, message);
    }

    // délai entre générations
    if (i < count - 1) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  generateBtn.disabled = false;
};

// ================= FORM =================
promptForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const prompt = promptInput.value.trim();
  if (!prompt) {
    promptInput.focus();
    return;
  }

  generateImages({
    prompt,
    count: parseInt(countSelect.value, 10) || 1,
    ratio: ratioSelect.value || "1/1",
    model: modelSelect.value || "auto",
  });
});

// bouton suggestion prompt
promptBtn.addEventListener("click", () => {
  promptInput.value =
    examplePrompts[Math.floor(Math.random() * examplePrompts.length)];
  promptInput.focus();
});
