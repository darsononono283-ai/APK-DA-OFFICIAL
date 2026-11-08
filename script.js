
const applications = [
  {
    name: "TikTok",
    category: "Sosial",
    icon: "♪",
    description: "Platform video pendek."
  },
  {
    name: "Spotify",
    category: "Media",
    icon: "♫",
    description: "Dengarkan musik favorit."
  },
  {
    name: "CapCut",
    category: "Tools",
    icon: "✂",
    description: "Aplikasi edit video."
  },
  {
    name: "Minecraft",
    category: "Game",
    icon: "▦",
    description: "Game petualangan dan kreativitas."
  },
  {
    name: "WhatsApp",
    category: "Sosial",
    icon: "◉",
    description: "Aplikasi pesan dan panggilan."
  },
  {
    name: "File Manager",
    category: "Tools",
    icon: "▤",
    description: "Kelola file perangkat."
  }
];

const appList = document.getElementById("appList");
const searchInput = document.getElementById("searchInput");
const appCount = document.getElementById("appCount");
const categories = document.getElementById("categories");

let selectedCategory = "Semua";

function renderApps() {
  const keyword = searchInput.value.toLowerCase();

  const filtered = applications.filter(app => {
    const matchName = app.name.toLowerCase().includes(keyword);
    const matchCategory =
      selectedCategory === "Semua" ||
      app.category === selectedCategory;

    return matchName && matchCategory;
  });

  appCount.textContent = filtered.length + " aplikasi";

  if (filtered.length === 0) {
    appList.innerHTML =
      '<div class="empty">Aplikasi tidak ditemukan.</div>';
    return;
  }

  appList.innerHTML = filtered.map(app => `
    <article class="app-card">
      <div class="app-icon">${app.icon}</div>
      <h3>${app.name}</h3>
      <p>${app.description}</p>
      <a class="detail-link" href="detail.html?app=${app.name.toLowerCase().replace(/\s+/g, '')}">
  Lihat Detail →
</a>
    </article>
  `).join("");
}

searchInput.addEventListener("input", renderApps);

categories.addEventListener("click", event => {
  const button = event.target.closest("[data-category]");

  if (!button) return;

  selectedCategory = button.dataset.category;

  document.querySelectorAll(".category").forEach(item => {
    item.classList.toggle("active", item === button);
  });

  renderApps();
});

renderApps();
