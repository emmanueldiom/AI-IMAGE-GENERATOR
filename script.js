const themeToggle = document.querySelector(".theme-toggle");
const promptInput = document.querySelector(".prompt-input");
const promptForm = document.querySelector(".prompt-form");
const promptBtn = document.querySelector(".prompt-btn");
const generateBtn = document.querySelector(".generate-btn");
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
const updateImageCard = (index, imgUrl) => {
  const card = document.getElementById(`img-card-${index}`);
  if (!card) return;
  card.classList.remove("loading");
  card.innerHTML = `
        <img src="${imgUrl}" class="result-img">
        <div class="img-overlay">
            <a href="${imgUrl}" class="img-download-btn" download="image-${Date.now()}.png">
                <i class="fa-solid fa-download"></i>
            </a>
        </div>
    `;
};

const showErrorOnCard = (index, message) => {
  const card = document.getElementById(`img-card-${index}`);
  if (!card) return;
  card.classList.remove("loading");
  card.classList.add("error");
  card.innerHTML = `
        <div class="status-container">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <p class="status-text">${message}</p>
        </div>
    `;
};

// ================= GENERATE =================
const generateImages = async (count, promptText) => {
  generateBtn.disabled = true;
  gridGallery.innerHTML = "";

  for (let i = 0; i < count; i++) {
    gridGallery.innerHTML += `
    <div class="img-card loading" id="img-card-${i}">
        <div class="status-container">
            <div class="spinner"></div>
            <p class="status-text">Génération en cours...<br><small>Peut prendre 1-3 min</small></p>
        </div>
    </div>
`;
  }

  for (let i = 0; i < count; i++) {
    try {
      const response = await fetch("http://localhost:3000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erreur serveur");
      }

      // Le serveur renvoie toujours un blob image maintenant
      const blob = await response.blob();
      const imgUrl = URL.createObjectURL(blob);
      updateImageCard(i, imgUrl);
    } catch (error) {
      console.error("Erreur image", i, ":", error.message);
      showErrorOnCard(i, error.message);
    }

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
  const count = parseInt(countSelect.value) || 1;
  if (!prompt) return alert("Saisis un prompt !");
  generateImages(count, prompt);
});

promptBtn.addEventListener("click", () => {
  promptInput.value =
    examplePrompts[Math.floor(Math.random() * examplePrompts.length)];
  promptInput.focus();
});
