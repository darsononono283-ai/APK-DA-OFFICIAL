document.getElementById("year").textContent = new Date().getFullYear();
document.querySelectorAll("[data-placeholder-link]").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (link.getAttribute("href") === "#") {
      event.preventDefault();
      alert("Tautan Telegram belum dipasang. Ganti href pada welcome.html dengan tautan Telegram milikmu.");
    }
  });
});
