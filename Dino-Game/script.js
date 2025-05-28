const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 300;

// Load sprites
const dinoImg = new Image();
dinoImg.src = "assets/dino.png";

const cactusImg = new Image();
cactusImg.src = "assets/cactus.png";

// Dino properties (adjust width/height to match your PNG)
const dino = {
  x: 50,
  y: 180,
  width: 60,
  height: 60,
  speedY: 0,
  gravity: 1.5,
  jumpForce: -20,
  isJumping: false,
};

// Game variables
const cacti = [];
let cactusSpeed = 5;
let score = 0;
let gameOver = false;
let gameStarted = false;

// Wait for images to load
let imagesLoaded = 0;
function imageLoaded() {
  imagesLoaded++;
  if (imagesLoaded === 2 && !gameStarted) {
    gameStarted = true;
    gameLoop();
  }
}

dinoImg.onload = imageLoaded;
cactusImg.onload = imageLoaded;

// Jump on Space key
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !dino.isJumping && gameStarted) {
    dino.speedY = dino.jumpForce;
    dino.isJumping = true;
  }
});

// Game loop
function gameLoop() {
  if (gameOver) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update dino position
  dino.y += dino.speedY;
  dino.speedY += dino.gravity;

  // Ground collision
  if (dino.y > 180) {
    dino.y = 180;
    dino.isJumping = false;
    dino.speedY = 0;
  }

  // Draw dino
  ctx.drawImage(dinoImg, dino.x, dino.y, dino.width, dino.height);

  // Spawn cacti randomly
  if (Math.random() < 0.01) {
    cacti.push({
      x: canvas.width,
      y: 190,
      width: 40,
      height: 50,
    });
  }

  // Update and draw cacti
  for (let i = 0; i < cacti.length; i++) {
    cacti[i].x -= cactusSpeed;
    ctx.drawImage(
      cactusImg,
      cacti[i].x,
      cacti[i].y,
      cacti[i].width,
      cacti[i].height
    );

    // Collision detection
    if (
      dino.x < cacti[i].x + cacti[i].width &&
      dino.x + dino.width > cacti[i].x &&
      dino.y < cacti[i].y + cacti[i].height &&
      dino.y + dino.height > cacti[i].y
    ) {
      gameOver = true;
      ctx.font = "30px Arial";
      ctx.fillText("GAME OVER", canvas.width / 2 - 100, canvas.height / 2);
    }

    // Remove off-screen cacti and increase score
    if (cacti[i].x < -50) {
      cacti.splice(i, 1);
      score++;
      cactusSpeed += 0.1; // Increase difficulty
    }
  }

  // Draw score
  ctx.fillStyle = "#000";
  ctx.font = "20px Arial";
  ctx.fillText(`Score: ${score}`, 20, 30);

  requestAnimationFrame(gameLoop);
}
