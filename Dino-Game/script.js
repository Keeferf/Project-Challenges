const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Canvas setup
canvas.width = 768;
canvas.height = 288;

// Game state
let gameState = "start"; // "start", "playing", or "gameover"

// Load assets
const idleSheet = new Image();
idleSheet.src = "assets/dino-idle-sheet.png";
const runSheet = new Image();
runSheet.src = "assets/dino-run-sheet.png";
const jumpImg = new Image();
jumpImg.src = "assets/dino-jump.png";
const duckSheet = new Image();
duckSheet.src = "assets/dino-duck-sheet.png";
const groundImg = new Image();
groundImg.src = "assets/ground.png";
const mainBgImg = new Image();
mainBgImg.src = "assets/main-background.png";
const farBgImg = new Image();
farBgImg.src = "assets/far-background.png";
const closeBgImg = new Image();
closeBgImg.src = "assets/close-background.png";
const boxObstacleImg = new Image();
boxObstacleImg.src = "assets/box-obstacle.png";

// Animation control
const animations = {
  idle: {
    sheet: idleSheet,
    frameWidth: 45,
    frameHeight: 51,
    spacing: 0,
    totalFrames: 4,
    frameDelay: 16,
  },
  run: {
    sheet: runSheet,
    frameWidth: 45,
    frameHeight: 51,
    spacing: 0,
    totalFrames: 6,
    frameDelay: 18,
  },
  duck: {
    sheet: duckSheet,
    frameWidth: 54,
    frameHeight: 42,
    spacing: 0,
    totalFrames: 7,
    frameDelay: 21,
  },
};

// Dino properties
const dino = {
  x: 50,
  y: canvas.height - 83,
  width: 45,
  height: 51,
  speedY: 0,
  gravity: 0.15,
  jumpForce: -7,
  isJumping: false,
  isDucking: false,
  currentAnim: "idle",
  currentFrame: 0,
  frameCount: 0,
  maxJumpHeight: 120,
  jumpPeak: false,
  normalHeight: 51,
  duckHeight: 39,
};

// Background system
const backgrounds = {
  main: { img: mainBgImg, x: 0, speed: 0.3 },
  far: { img: farBgImg, x: 0, speed: 0.6 },
  close: { img: closeBgImg, x: 0, speed: 0.9 },
};

// Obstacle system
const obstacles = {
  box: {
    img: boxObstacleImg,
    width: 33,
    height: 26,
    minGap: 300,
    maxGap: 500,
    speed: 1.5,
  },
};

let groundX = 0;
let gameSpeed = 1.5;
let spaceKeyReleased = true;
let downKeyPressed = false;
let activeObstacles = [];
let obstacleTimer = 0;
let nextObstacleTime = 0;
let score = 0;
let highScore = 0;

// Screens
function drawStartScreen() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "28px 'Jersey 15'";
  ctx.textAlign = "center";
  ctx.fillText("Press SPACE to Start", canvas.width / 2, canvas.height / 2);
  ctx.textAlign = "left";
}

function drawGameOverScreen() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "30px 'Jersey 15'";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 30);
  ctx.font = "24px 'Jersey 15'";
  ctx.fillText(
    `Score: ${score} | High: ${highScore}`,
    canvas.width / 2,
    canvas.height / 2 + 10
  );
  ctx.fillText(
    "Press SPACE to Restart",
    canvas.width / 2,
    canvas.height / 2 + 40
  );
  ctx.textAlign = "left";
}

// Game functions
function drawBackgrounds() {
  Object.values(backgrounds).forEach((bg) => {
    const tilesNeeded = Math.ceil(canvas.width / canvas.width) + 1;
    for (let i = 0; i < tilesNeeded; i++) {
      ctx.drawImage(
        bg.img,
        bg.x + i * canvas.width,
        0,
        canvas.width,
        canvas.height
      );
    }

    if (gameState === "playing") {
      bg.x -= gameSpeed * bg.speed;
      if (bg.x <= -canvas.width) bg.x = 0;
    }
  });
}

function drawDino() {
  let drawHeight = dino.height;
  let drawY = dino.y;

  if (dino.isDucking && !dino.isJumping) {
    drawHeight = dino.duckHeight;
    drawY = canvas.height - 83 + (dino.normalHeight - dino.duckHeight);
  }

  if (dino.isJumping) {
    ctx.drawImage(jumpImg, dino.x, dino.y, dino.width, dino.height);
  } else {
    const anim = animations[dino.currentAnim];
    const frameX = dino.currentFrame * (anim.frameWidth + anim.spacing);
    ctx.drawImage(
      anim.sheet,
      frameX,
      0,
      anim.frameWidth,
      anim.frameHeight,
      dino.x,
      drawY,
      dino.width,
      drawHeight
    );

    dino.frameCount++;
    if (dino.frameCount >= anim.frameDelay) {
      dino.currentFrame = (dino.currentFrame + 1) % anim.totalFrames;
      dino.frameCount = 0;
    }
  }
}

function drawGround() {
  const tilesNeeded = Math.ceil(canvas.width / 32) + 1;
  for (let i = 0; i < tilesNeeded; i++) {
    ctx.drawImage(groundImg, groundX + i * 32, canvas.height - 32, 32, 32);
  }
  if (gameState === "playing") {
    groundX -= gameSpeed;
    if (groundX <= -32) groundX = 0;
  }
}

function generateObstacle() {
  const obstacleType = "box";
  const obstacle = {
    type: obstacleType,
    x: canvas.width,
    y: canvas.height - 32 - obstacles[obstacleType].height,
    width: obstacles[obstacleType].width,
    height: obstacles[obstacleType].height,
    passed: false,
  };
  activeObstacles.push(obstacle);
  nextObstacleTime =
    Math.random() * (obstacles.box.maxGap - obstacles.box.minGap) +
    obstacles.box.minGap;
}

function drawObstacles() {
  activeObstacles.forEach((obstacle, index) => {
    ctx.drawImage(
      obstacles[obstacle.type].img,
      obstacle.x,
      obstacle.y,
      obstacle.width,
      obstacle.height
    );

    if (gameState === "playing") {
      obstacle.x -= gameSpeed;
    }

    if (obstacle.x < -obstacle.width) {
      activeObstacles.splice(index, 1);
    }

    if (!obstacle.passed && obstacle.x + obstacle.width < dino.x) {
      obstacle.passed = true;
      score++;
      highScore = Math.max(score, highScore);

      if (score % 5 === 0) {
        gameSpeed += 0.1;
      }
    }
  });
}

function checkCollisions() {
  activeObstacles.forEach((obstacle) => {
    if (
      dino.x < obstacle.x + obstacle.width &&
      dino.x + dino.width > obstacle.x &&
      dino.y < obstacle.y + obstacle.height &&
      dino.y + dino.height > obstacle.y
    ) {
      gameOver();
    }
  });
}

function gameOver() {
  gameState = "gameover";
  dino.currentAnim = "idle";
  dino.isJumping = false;
  dino.isDucking = false;
  dino.y = canvas.height - 83;
  dino.speedY = 0;
  activeObstacles = [];
  obstacleTimer = 0;
  nextObstacleTime = 0;
}

function drawScore() {
  ctx.fillStyle = "#fff";
  ctx.font = "24px 'Jersey 15'";
  ctx.fillText(`Score: ${score}`, 20, 30);
  ctx.fillText(`High: ${highScore}`, 20, 60);
}

// Input handling
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    if (gameState === "start") {
      gameState = "playing";
      dino.currentAnim = "run";
      score = 0;
      gameSpeed = 1.5;
      spaceKeyReleased = false;
    } else if (gameState === "gameover") {
      gameState = "playing";
      dino.currentAnim = "run";
      score = 0;
      gameSpeed = 1.5;
      spaceKeyReleased = false;
    } else if (!dino.isJumping && spaceKeyReleased && gameState === "playing") {
      dino.speedY = dino.jumpForce;
      dino.isJumping = true;
      dino.jumpPeak = false;
      spaceKeyReleased = false;
    }
  }

  if (e.code === "ArrowDown" && gameState === "playing" && !dino.isJumping) {
    dino.isDucking = true;
    dino.currentAnim = "duck";
    downKeyPressed = true;
  }
});

document.addEventListener("keyup", (e) => {
  if (e.code === "Space") spaceKeyReleased = true;

  if (e.code === "ArrowDown") {
    if (downKeyPressed && !dino.isJumping && gameState === "playing") {
      dino.isDucking = false;
      dino.currentAnim = "run";
    }
    downKeyPressed = false;
  }
});

// Game loop
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackgrounds();
  drawGround();
  drawObstacles();
  drawDino();
  drawScore();

  if (gameState === "playing") {
    // Obstacle generation
    obstacleTimer += gameSpeed;
    if (obstacleTimer > nextObstacleTime) {
      generateObstacle();
      obstacleTimer = 0;
    }

    // Physics
    dino.y += dino.speedY;
    const currentJumpHeight = canvas.height - 83 - dino.y;
    if (!dino.jumpPeak && dino.speedY > 0) {
      dino.jumpPeak = true;
    }

    const effectiveGravity = dino.jumpPeak
      ? dino.gravity * 1.5
      : dino.gravity * 0.8;
    dino.speedY += effectiveGravity;

    if (currentJumpHeight > dino.maxJumpHeight) {
      dino.speedY = 0;
      dino.y = canvas.height - 83 - dino.maxJumpHeight;
      dino.jumpPeak = true;
    }

    // Ground collision
    const groundLevel = canvas.height - 83;
    if (dino.y > groundLevel) {
      dino.y = groundLevel;
      dino.isJumping = false;
      dino.speedY = 0;
      dino.jumpPeak = false;
      dino.currentAnim = downKeyPressed ? "duck" : "run";
    }

    checkCollisions();
  } else if (gameState === "start") {
    drawStartScreen();
  } else if (gameState === "gameover") {
    drawGameOverScreen();
  }

  requestAnimationFrame(gameLoop);
}

// Initialize
let imagesLoaded = 0;
function imageLoaded() {
  if (++imagesLoaded === 9) gameLoop();
}

idleSheet.onload = imageLoaded;
runSheet.onload = imageLoaded;
jumpImg.onload = imageLoaded;
duckSheet.onload = imageLoaded;
groundImg.onload = imageLoaded;
mainBgImg.onload = imageLoaded;
farBgImg.onload = imageLoaded;
closeBgImg.onload = imageLoaded;
boxObstacleImg.onload = imageLoaded;
