
const bgMusic = new Audio("./music.mp3");
bgMusic.loop = true;

const musicBtn = document.getElementById("musicBtn");

if (musicBtn) {
  musicBtn.addEventListener("click", async () => {
    if (bgMusic.paused) {
      try {
        await bgMusic.play();
        musicBtn.textContent = "⏸️";
      } catch (error) {
        alert("Musik gagal diputar. Periksa file music.mp3.");
      }
    } else {
      bgMusic.pause();
      musicBtn.textContent = "🎵";
    }
  });
}
