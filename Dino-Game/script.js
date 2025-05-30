// === Constants ===
const IS_MOBILE =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
const MOBILE_JUMP_THRESHOLD = 5;
const CANVAS_WIDTH = 768;
const CANVAS_HEIGHT = 288;
const GRAVITY = 0.06;
const JUMP_FORCE = -7;
const INITIAL_GAME_SPEED = 2;

// === Mobile Orientation ===
const orientation = {
  isPortrait: function () {
    return window.innerHeight > window.innerWidth;
  },
  setupHandler: function () {
    window.addEventListener("resize", this.checkOrientation.bind(this));
    this.checkOrientation();
  },
  checkOrientation: function () {
    if (IS_MOBILE) {
      if (this.isPortrait()) {
        document.body.classList.add("portrait");
        document.body.classList.remove("landscape");
        this.showOrientationWarning(true);
      } else {
        document.body.classList.add("landscape");
        document.body.classList.remove("portrait");
        this.showOrientationWarning(false);
      }
    }
  },
  showOrientationWarning: function (show) {
    let warning = document.getElementById("orientation-warning");
    if (!warning && show) {
      warning = document.createElement("div");
      warning.id = "orientation-warning";
      warning.className = "force-landscape";
      warning.innerHTML =
        '<div class="landscape-warning">Please rotate your device to landscape mode to play</div>';
      document.body.appendChild(warning);
    } else if (warning && !show) {
      warning.remove();
    }
  },
};

// === Game State ===
const gameState = {
  current: "start",
  speed: INITIAL_GAME_SPEED,
  score: 0,
  highScore: 0,
  spaceKeyReleased: true,
  downKeyPressed: false,
  startTime: null,
  lastSpeedIncrease: 0,
};

// === Asset Management ===
const assets = {
  images: {
    idleSheet: { src: "assets/dino-idle-sheet.png", img: new Image() },
    runSheet: { src: "assets/dino-run-sheet.png", img: new Image() },
    jumpImg: { src: "assets/dino-jump.png", img: new Image() },
    duckSheet: { src: "assets/dino-duck-sheet.png", img: new Image() },
    groundImg: { src: "assets/ground.png", img: new Image() },
    mainBgImg: { src: "assets/main-background.png", img: new Image() },
    farBgImg: { src: "assets/far-background.png", img: new Image() },
    closeBgImg: { src: "assets/close-background.png", img: new Image() },
    boxObstacleImg: { src: "assets/box-obstacle.png", img: new Image() },
    logObstacleImg: { src: "assets/log-obstacle.png", img: new Image() },
    flyingObstacleSheet: {
      src: "assets/flying-obstacle-sheet.png",
      img: new Image(),
    },
  },
  loadAll: function (callback) {
    let loadedCount = 0;
    const imageValues = Object.values(this.images); // Get just the values we need
    const totalImages = imageValues.length;

    imageValues.forEach((imageObj) => {
      imageObj.img.src = imageObj.src;
      imageObj.img.onload = () => {
        if (++loadedCount === totalImages) callback();
      };
    });
  },
};

// === Animation System ===
const animations = {
  idle: {
    sheet: assets.images.idleSheet.img,
    frameWidth: 45,
    frameHeight: 51,
    spacing: 0,
    totalFrames: 4,
    frameDelay: 20,
  },
  run: {
    sheet: assets.images.runSheet.img,
    frameWidth: 45,
    frameHeight: 51,
    spacing: 0,
    totalFrames: 6,
    frameDelay: 18,
  },
  duck: {
    sheet: assets.images.duckSheet.img,
    frameWidth: 54,
    frameHeight: 42,
    spacing: 0,
    totalFrames: 7,
    frameDelay: 21,
  },
  flyingObstacle: {
    sheet: assets.images.flyingObstacleSheet.img,
    frameWidth: 32,
    frameHeight: 31,
    spacing: 0,
    totalFrames: 7,
    frameDelay: 21,
  },
};

// === Game Objects ===
const dino = {
  x: 50,
  y: CANVAS_HEIGHT - 83,
  width: 45,
  height: 51,
  speedY: 0,
  isJumping: false,
  isDucking: false,
  currentAnim: "idle",
  currentFrame: 0,
  frameCount: 0,
  jumpPeak: false,
  normalHeight: 51,
  duckHeight: 41,
  maxJumpHeight: 120,

  update: function () {
    // Physics
    this.y += this.speedY;
    const currentJumpHeight = CANVAS_HEIGHT - 83 - this.y;

    if (!this.jumpPeak && this.speedY > 0) {
      this.jumpPeak = true;
    }

    const effectiveGravity = this.jumpPeak ? GRAVITY * 1.5 : GRAVITY * 0.8;
    this.speedY += effectiveGravity;

    if (currentJumpHeight > this.maxJumpHeight) {
      this.speedY = 0;
      this.y = CANVAS_HEIGHT - 83 - this.maxJumpHeight;
      this.jumpPeak = true;
    }

    // Ground collision
    const groundLevel = CANVAS_HEIGHT - 83;
    if (this.y > groundLevel) {
      this.y = groundLevel;
      this.isJumping = false;
      this.speedY = 0;
      this.jumpPeak = false;

      // Only change animation if game is playing
      if (gameState.current === "playing") {
        this.currentAnim = gameState.downKeyPressed ? "duck" : "run";
      }
    }
  },

  jump: function () {
    if (
      !this.isJumping &&
      gameState.spaceKeyReleased &&
      gameState.current === "playing"
    ) {
      this.speedY = JUMP_FORCE;
      this.isJumping = true;
      this.jumpPeak = false;
      gameState.spaceKeyReleased = false;
    }
  },

  duck: function (isDucking) {
    if (gameState.current !== "playing") return;

    if (isDucking && !this.isJumping) {
      this.isDucking = true;
      this.currentAnim = "duck";
    } else if (!isDucking && !this.isJumping) {
      this.isDucking = false;
      this.currentAnim = "run";
    }
  },
};

const backgrounds = {
  main: { img: assets.images.mainBgImg.img, x: 0, speed: 0.3 },
  far: { img: assets.images.farBgImg.img, x: 0, speed: 0.6 },
  close: { img: assets.images.closeBgImg.img, x: 0, speed: 0.9 },

  update: function () {
    if (gameState.current === "playing") {
      Object.values(this).forEach((bg) => {
        if (typeof bg === "object") {
          bg.x -= gameState.speed * bg.speed;
          if (bg.x <= -CANVAS_WIDTH) bg.x = 0;
        }
      });
    }
  },

  draw: function (ctx) {
    Object.values(this).forEach((bg) => {
      if (typeof bg === "object") {
        const tilesNeeded = Math.ceil(CANVAS_WIDTH / CANVAS_WIDTH) + 1;
        for (let i = 0; i < tilesNeeded; i++) {
          ctx.drawImage(
            bg.img,
            bg.x + i * CANVAS_WIDTH,
            0,
            CANVAS_WIDTH,
            CANVAS_HEIGHT
          );
        }
      }
    });
  },
};

const ground = {
  x: 0,

  update: function () {
    if (gameState.current === "playing") {
      this.x -= gameState.speed;
      if (this.x <= -32) this.x = 0;
    }
  },

  draw: function (ctx) {
    const tilesNeeded = Math.ceil(CANVAS_WIDTH / 32) + 1;
    for (let i = 0; i < tilesNeeded; i++) {
      ctx.drawImage(
        assets.images.groundImg.img,
        this.x + i * 32,
        CANVAS_HEIGHT - 32,
        32,
        32
      );
    }
  },
};

const obstacles = {
  box: {
    img: assets.images.boxObstacleImg.img,
    width: 33,
    height: 26,
    hitbox: {
      xOffset: 1,
      yOffset: 1,
      width: 31,
      height: 24,
    },
    minGap: 300,
    maxGap: 500,
  },
  log: {
    img: assets.images.logObstacleImg.img,
    width: 81,
    height: 29,
    hitbox: {
      xOffset: 3,
      yOffset: 2,
      width: 75,
      height: 25,
    },
    minGap: 400,
    maxGap: 600,
  },
  flying: {
    img: assets.images.flyingObstacleSheet.img,
    width: 32,
    height: 32,
    hitbox: {
      xOffset: 0,
      yOffset: 0,
      width: 32,
      height: 32,
    },
    minGap: 500,
    maxGap: 700,
    yVariation: 80,
    minHeight: CANVAS_HEIGHT - 150,
  },
  active: [],
  timer: 0,
  nextTime: 0,

  generate: function () {
    const availableTypes =
      gameState.speed >= 3
        ? ["box", "log", "flying"]
        : gameState.speed >= 2.5
          ? ["box", "log"]
          : ["box"];

    const type =
      availableTypes[Math.floor(Math.random() * availableTypes.length)];

    let yPos;
    if (type === "flying") {
      const shouldOverlap = Math.random() < 0.6;
      if (shouldOverlap) {
        yPos = CANVAS_HEIGHT - 83 - dino.height + 25;
      } else {
        yPos = this.flying.minHeight - Math.random() * this.flying.yVariation;
      }
    } else {
      yPos = CANVAS_HEIGHT - 32 - this[type].height;
    }

    const obstacle = {
      type: type,
      x: CANVAS_WIDTH,
      y: yPos,
      width: this[type].width,
      height: this[type].height,
      passed: false,
      currentFrame: 0,
      frameCount: 0,
    };

    this.active.push(obstacle);
    this.nextTime =
      Math.random() * (this[type].maxGap - this[type].minGap) +
      this[type].minGap;
  },

  update: function () {
    if (gameState.current === "playing") {
      // Obstacle generation
      this.timer += gameState.speed;
      if (this.timer > this.nextTime) {
        this.generate();
        this.timer = 0;
      }

      // Update active obstacles
      this.active.forEach((obstacle, index) => {
        obstacle.x -= gameState.speed;

        if (obstacle.x < -obstacle.width) {
          this.active.splice(index, 1);
        }

        if (!obstacle.passed && obstacle.x + obstacle.width < dino.x) {
          obstacle.passed = true;
        }
      });
    }
  },

  draw: function (ctx) {
    this.active.forEach((obstacle) => {
      if (obstacle.type === "flying") {
        const anim = animations.flyingObstacle;
        const frameX = obstacle.currentFrame * anim.frameWidth;
        ctx.drawImage(
          anim.sheet,
          frameX,
          0,
          anim.frameWidth,
          anim.frameHeight,
          obstacle.x,
          obstacle.y,
          obstacle.width,
          obstacle.height
        );

        obstacle.frameCount++;
        if (obstacle.frameCount >= anim.frameDelay) {
          obstacle.currentFrame =
            (obstacle.currentFrame + 1) % anim.totalFrames;
          obstacle.frameCount = 0;
        }
      } else {
        // Original drawing for ground obstacles
        ctx.drawImage(
          this[obstacle.type].img,
          obstacle.x,
          obstacle.y,
          obstacle.width,
          obstacle.height
        );
      }
    });
  },

  checkCollisions: function () {
    this.active.forEach((obstacle) => {
      const obstLeft = obstacle.x + this[obstacle.type].hitbox.xOffset;
      const obstTop = obstacle.y + this[obstacle.type].hitbox.yOffset;
      const obstRight = obstLeft + this[obstacle.type].hitbox.width;
      const obstBottom = obstTop + this[obstacle.type].hitbox.height;

      // Use duckHeight if ducking, otherwise normal height
      const dinoHeight = dino.isDucking ? dino.duckHeight : dino.height;
      const dinoYOffset = dino.isDucking
        ? dino.normalHeight - dino.duckHeight
        : 0;

      if (
        dino.x < obstRight &&
        dino.x + dino.width > obstLeft &&
        dino.y + dinoYOffset < obstBottom && // Adjusted for ducking
        dino.y + dinoYOffset + dinoHeight > obstTop // Use dynamic height
      ) {
        gameOver();
      }
    });
  },
};

// === User Interface ===
const screens = {
  start: function (ctx) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = "#fff";
    ctx.font = "28px 'Jersey 15'";
    ctx.textAlign = "center";
    ctx.fillText("Press SPACE to Start", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.textAlign = "left";
  },

  gameOver: function (ctx) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = "#fff";
    ctx.font = "32px 'Jersey 15'";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);
    ctx.font = "24px 'Jersey 15'";
    ctx.fillText(
      `Score: ${gameState.score} | High: ${gameState.highScore}`,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 + 10
    );
    ctx.fillText(
      "Press SPACE to Restart",
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 + 40
    );
    ctx.textAlign = "left";
  },

  score: function (ctx) {
    ctx.fillStyle = "#fff";
    ctx.font = "24px 'Jersey 15'";
    ctx.fillText(`Score: ${gameState.score}`, 20, 30);
    ctx.fillText(`Highscore: ${gameState.highScore}`, 20, 60);
  },
};

// === Game Functions ===
function drawDino(ctx) {
  let drawHeight = dino.height;
  let drawY = dino.y;

  if (dino.isDucking && !dino.isJumping) {
    drawHeight = dino.duckHeight;
    drawY = CANVAS_HEIGHT - 83 + (dino.normalHeight - dino.duckHeight);
  }

  if (dino.isJumping) {
    ctx.drawImage(
      assets.images.jumpImg.img,
      dino.x,
      dino.y,
      dino.width,
      dino.height
    );
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

function gameOver() {
  gameState.current = "gameover";
  dino.currentAnim = "idle";
  dino.isJumping = false;
  dino.isDucking = false;
  dino.y = CANVAS_HEIGHT - 83;
  dino.speedY = 0;
  obstacles.active = [];
  obstacles.timer = 0;
  obstacles.nextTime = 0;
}

function resetGame() {
  gameState.current = "playing";
  gameState.speed = INITIAL_GAME_SPEED;
  gameState.score = 0;
  gameState.startTime = Date.now();
  dino.currentAnim = "run";
}

// === Input Handling ===
function setupInputHandlers() {
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      if (gameState.current === "start" || gameState.current === "gameover") {
        resetGame();
        gameState.spaceKeyReleased = false;
      } else {
        dino.jump();
      }
    }

    if (
      e.code === "ArrowDown" &&
      gameState.current === "playing" &&
      !dino.isJumping
    ) {
      dino.duck(true);
      gameState.downKeyPressed = true;
    }
  });

  document.addEventListener("keyup", (e) => {
    if (e.code === "Space") gameState.spaceKeyReleased = true;

    if (e.code === "ArrowDown") {
      if (
        gameState.downKeyPressed &&
        !dino.isJumping &&
        gameState.current === "playing"
      ) {
        dino.duck(false);
      }
      gameState.downKeyPressed = false;
    }
  });

  // Touch controls (for mobile)
  if (IS_MOBILE) {
    let touchStartY = 0;
    let touchEndY = 0;
    let isSwipe = false;

    canvas.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        touchStartY = e.touches[0].clientY;
        isSwipe = false; // Reset swipe flag on new touch

        // Start game if needed
        if (gameState.current === "start" || gameState.current === "gameover") {
          resetGame();
          return;
        }
      },
      { passive: false }
    );

    canvas.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        touchEndY = e.touches[0].clientY;

        // Only consider it a swipe after significant movement
        if (Math.abs(touchEndY - touchStartY) > MOBILE_JUMP_THRESHOLD * 2) {
          isSwipe = true;

          // Duck only on downward swipe
          if (gameState.current === "playing" && touchEndY > touchStartY) {
            // Only if swiping down
            dino.duck(true);
            gameState.downKeyPressed = true;
          }
        }
      },
      { passive: false }
    );

    canvas.addEventListener(
      "touchend",
      (e) => {
        e.preventDefault();

        // Jump only if it wasn't a swipe
        if (gameState.current === "playing" && !isSwipe) {
          if (gameState.spaceKeyReleased) {
            dino.jump();
            gameState.spaceKeyReleased = false;
          }
        }

        // Release duck if it was pressed
        if (gameState.downKeyPressed) {
          dino.duck(false);
          gameState.downKeyPressed = false;
        }

        // Reset jump flag
        gameState.spaceKeyReleased = true;
      },
      { passive: false }
    );
  }
}

// === Main Game Loop ===
function gameLoop() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  backgrounds.draw(ctx);
  backgrounds.update();

  ground.draw(ctx);
  ground.update();

  obstacles.draw(ctx);
  obstacles.update();

  drawDino(ctx);
  dino.update();

  screens.score(ctx);

  if (gameState.current === "playing") {
    obstacles.checkCollisions();
    const elapsedSeconds = Math.floor(
      (Date.now() - gameState.startTime) / 1000
    );

    // Only update score if it's changed
    if (elapsedSeconds > gameState.score) {
      gameState.score = elapsedSeconds;
      gameState.highScore = Math.max(gameState.score, gameState.highScore);
    }

    // Increase speed every 10 seconds
    if (gameState.score > 0 && gameState.score % 3 === 0) {
      if (
        !gameState.lastSpeedIncrease ||
        gameState.lastSpeedIncrease < gameState.score
      ) {
        gameState.speed += 0.1;
        gameState.lastSpeedIncrease = gameState.score;
      }
    }
  } else if (gameState.current === "start") {
    screens.start(ctx);
  } else if (gameState.current === "gameover") {
    screens.gameOver(ctx);
  }

  requestAnimationFrame(gameLoop);
}

// === Initialization ===
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Replace your existing resizeCanvas function with this:
function resizeCanvas() {
  const container = document.getElementById("game-container");
  let containerWidth, containerHeight;

  if (IS_MOBILE && orientation.isPortrait()) {
    // Use screen dimensions in landscape even if we're in portrait
    containerWidth = window.screen.height;
    containerHeight = window.screen.width;
  } else {
    containerWidth = container.clientWidth;
    containerHeight = container.clientHeight;
  }

  // Maintain aspect ratio
  const aspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
  let newWidth = containerWidth;
  let newHeight = containerWidth / aspectRatio;

  if (newHeight > containerHeight) {
    newHeight = containerHeight;
    newWidth = containerHeight * aspectRatio;
  }

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  canvas.style.width = `${newWidth}px`;
  canvas.style.height = `${newHeight}px`;
}

// Replace your existing initialization code with this:
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

if (IS_MOBILE) {
  orientation.setupHandler();
}

setupInputHandlers();
assets.loadAll(gameLoop);
