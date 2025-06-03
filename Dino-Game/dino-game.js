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

class DinoGame {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");

    // Game state
    this.gameState = {
      current: "start",
      speed: INITIAL_GAME_SPEED,
      score: 0,
      highScore: 0,
      spaceKeyReleased: true,
      downKeyPressed: false,
      startTime: null,
      lastSpeedIncrease: 0,
    };

    // Initialize game objects
    this.initObjects();

    // Store instance for resize handler
    window.dinoGameInstance = this;

    this.initGame();
  }

  initObjects() {
    // Assets
    this.assets = {
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
    };

    // Dino
    this.dino = {
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
      duckHeight: 42,
      maxJumpHeight: 120,
    };

    // Backgrounds
    this.backgrounds = {
      main: { img: null, x: 0, speed: 0.3 },
      far: { img: null, x: 0, speed: 0.6 },
      close: { img: null, x: 0, speed: 0.9 },
    };

    // Ground
    this.ground = { x: 0 };

    // Obstacles
    this.obstacles = {
      box: {
        img: null,
        width: 33,
        height: 26,
        hitbox: { xOffset: 1, yOffset: 1, width: 31, height: 24 },
        minGap: 300,
        maxGap: 500,
      },
      log: {
        img: null,
        width: 81,
        height: 29,
        hitbox: { xOffset: 3, yOffset: 2, width: 75, height: 25 },
        minGap: 400,
        maxGap: 600,
      },
      flying: {
        img: null,
        width: 32,
        height: 32,
        hitbox: { xOffset: 0, yOffset: 0, width: 32, height: 32 },
        minGap: 500,
        maxGap: 700,
        yVariation: 80,
        minHeight: CANVAS_HEIGHT - 150,
      },
      active: [],
      timer: 0,
      nextTime: 0,
    };

    // Animations
    this.animations = {
      idle: {
        sheet: null,
        frameWidth: 45,
        frameHeight: 51,
        spacing: 0,
        totalFrames: 4,
        frameDelay: 20,
      },
      run: {
        sheet: null,
        frameWidth: 45,
        frameHeight: 51,
        spacing: 0,
        totalFrames: 6,
        frameDelay: 18,
      },
      duck: {
        sheet: null,
        frameWidth: 54,
        frameHeight: 42,
        spacing: 0,
        totalFrames: 7,
        frameDelay: 21,
      },
      flyingObstacle: {
        sheet: null,
        frameWidth: 32,
        frameHeight: 31,
        spacing: 0,
        totalFrames: 7,
        frameDelay: 21,
      },
    };
  }

  loadAssets(callback) {
    const imageValues = Object.values(this.assets.images);
    const totalImages = imageValues.length;
    let loadedCount = 0;

    imageValues.forEach((imageObj) => {
      imageObj.img.onload = () => {
        loadedCount++;
        if (loadedCount === totalImages) {
          // Assign loaded images to their respective objects
          this.backgrounds.main.img = this.assets.images.mainBgImg.img;
          this.backgrounds.far.img = this.assets.images.farBgImg.img;
          this.backgrounds.close.img = this.assets.images.closeBgImg.img;

          this.obstacles.box.img = this.assets.images.boxObstacleImg.img;
          this.obstacles.log.img = this.assets.images.logObstacleImg.img;
          this.obstacles.flying.img =
            this.assets.images.flyingObstacleSheet.img;

          this.animations.idle.sheet = this.assets.images.idleSheet.img;
          this.animations.run.sheet = this.assets.images.runSheet.img;
          this.animations.duck.sheet = this.assets.images.duckSheet.img;
          this.animations.flyingObstacle.sheet =
            this.assets.images.flyingObstacleSheet.img;

          callback();
        }
      };
      imageObj.img.src = imageObj.src;
    });
  }

  // === Game Loop ===
  gameLoop() {
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw backgrounds
    this.drawBackgrounds();

    // Draw ground
    this.drawGround();

    // Draw obstacles
    this.drawObstacles();

    // Update obstacles
    this.updateObstacles();

    // Draw dino
    this.drawDino();

    // Update dino
    this.updateDino();

    // Draw score
    this.drawScore();

    // Game state handling
    if (this.gameState.current === "playing") {
      this.checkCollisions();
      this.updateScore();
    } else if (this.gameState.current === "start") {
      this.drawStartScreen();
    } else if (this.gameState.current === "gameover") {
      this.drawGameOverScreen();
    }

    requestAnimationFrame(() => this.gameLoop());
  }

  // === Drawing Methods ===
  drawBackgrounds() {
    Object.values(this.backgrounds).forEach((bg) => {
      if (typeof bg === "object" && bg.img) {
        const tilesNeeded = Math.ceil(CANVAS_WIDTH / CANVAS_WIDTH) + 1;
        for (let i = 0; i < tilesNeeded; i++) {
          this.ctx.drawImage(
            bg.img,
            bg.x + i * CANVAS_WIDTH,
            0,
            CANVAS_WIDTH,
            CANVAS_HEIGHT
          );
        }
      }
    });
  }

  drawGround() {
    const tilesNeeded = Math.ceil(CANVAS_WIDTH / 32) + 1;
    for (let i = 0; i < tilesNeeded; i++) {
      this.ctx.drawImage(
        this.assets.images.groundImg.img,
        this.ground.x + i * 32,
        CANVAS_HEIGHT - 32,
        32,
        32
      );
    }
  }

  drawObstacles() {
    this.obstacles.active.forEach((obstacle) => {
      if (obstacle.type === "flying") {
        const anim = this.animations.flyingObstacle;
        const frameX = obstacle.currentFrame * anim.frameWidth;
        this.ctx.drawImage(
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
        this.ctx.drawImage(
          this.obstacles[obstacle.type].img,
          obstacle.x,
          obstacle.y,
          obstacle.width,
          obstacle.height
        );
      }
    });
  }

  drawDino() {
    let drawHeight = this.dino.height;
    let drawY = this.dino.y;

    if (this.dino.isDucking && !this.dino.isJumping) {
      drawHeight = this.dino.duckHeight;
      drawY =
        CANVAS_HEIGHT - 83 + (this.dino.normalHeight - this.dino.duckHeight);
    }

    if (this.dino.isJumping) {
      this.ctx.drawImage(
        this.assets.images.jumpImg.img,
        this.dino.x,
        this.dino.y,
        this.dino.width,
        this.dino.height
      );
    } else {
      const anim = this.animations[this.dino.currentAnim];
      const frameX = this.dino.currentFrame * (anim.frameWidth + anim.spacing);
      this.ctx.drawImage(
        anim.sheet,
        frameX,
        0,
        anim.frameWidth,
        anim.frameHeight,
        this.dino.x,
        drawY,
        this.dino.width,
        drawHeight
      );

      this.dino.frameCount++;
      if (this.dino.frameCount >= anim.frameDelay) {
        this.dino.currentFrame =
          (this.dino.currentFrame + 1) % anim.totalFrames;
        this.dino.frameCount = 0;
      }
    }
  }

  drawScore() {
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "24px 'Jersey 15'";
    this.ctx.fillText(`Score: ${this.gameState.score}`, 20, 30);
    this.ctx.fillText(`Highscore: ${this.gameState.highScore}`, 20, 60);
  }

  drawStartScreen() {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "28px 'Jersey 15'";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      IS_MOBILE ? "TAP to Start" : "Press SPACE to Start",
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2
    );
    this.ctx.textAlign = "left";
  }

  drawGameOverScreen() {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "32px 'Jersey 15'";
    this.ctx.textAlign = "center";
    this.ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);
    this.ctx.font = "24px 'Jersey 15'";
    this.ctx.fillText(
      `Score: ${this.gameState.score} | High: ${this.gameState.highScore}`,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 + 10
    );
    this.ctx.fillText(
      IS_MOBILE ? "TAP to Restart" : "Press SPACE to Restart",
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 + 40
    );
    this.ctx.textAlign = "left";
  }

  // === Update Methods ===
  updateDino() {
    // Physics
    this.dino.y += this.dino.speedY;
    const currentJumpHeight = CANVAS_HEIGHT - 83 - this.dino.y;

    if (!this.dino.jumpPeak && this.dino.speedY > 0) {
      this.dino.jumpPeak = true;
    }

    const effectiveGravity = this.dino.jumpPeak ? GRAVITY * 1.5 : GRAVITY * 0.8;
    this.dino.speedY += effectiveGravity;

    if (currentJumpHeight > this.dino.maxJumpHeight) {
      this.dino.speedY = 0;
      this.dino.y = CANVAS_HEIGHT - 83 - this.dino.maxJumpHeight;
      this.dino.jumpPeak = true;
    }

    const groundLevel = CANVAS_HEIGHT - 83;
    if (this.dino.y > groundLevel) {
      this.dino.y = groundLevel;
      this.dino.isJumping = false;
      this.dino.speedY = 0;
      this.dino.jumpPeak = false;
      if (this.gameState.current === "playing") {
        this.dino.currentAnim = this.gameState.downKeyPressed ? "duck" : "run";
      }
    }
  }

  updateObstacles() {
    if (this.gameState.current === "playing") {
      // Update background positions
      Object.values(this.backgrounds).forEach((bg) => {
        if (typeof bg === "object") {
          bg.x -= this.gameState.speed * bg.speed;
          if (bg.x <= -CANVAS_WIDTH) bg.x = 0;
        }
      });

      // Update ground position
      this.ground.x -= this.gameState.speed;
      if (this.ground.x <= -32) this.ground.x = 0;

      // Generate and update obstacles
      this.obstacles.timer += this.gameState.speed;
      if (this.obstacles.timer > this.obstacles.nextTime) {
        this.generateObstacle();
        this.obstacles.timer = 0;
      }

      this.obstacles.active.forEach((obstacle, index) => {
        obstacle.x -= this.gameState.speed;

        if (obstacle.x < -obstacle.width) {
          this.obstacles.active.splice(index, 1);
        }

        if (!obstacle.passed && obstacle.x + obstacle.width < this.dino.x) {
          obstacle.passed = true;
        }
      });
    }
  }

  generateObstacle() {
    const availableTypes =
      this.gameState.speed >= 3
        ? ["box", "log", "flying"]
        : this.gameState.speed >= 2.5
          ? ["box", "log"]
          : ["box"];

    const type =
      availableTypes[Math.floor(Math.random() * availableTypes.length)];

    let yPos;
    if (type === "flying") {
      const shouldOverlap = Math.random() < 0.6;
      yPos = shouldOverlap
        ? CANVAS_HEIGHT - 83 - this.dino.height + 25
        : this.obstacles.flying.minHeight -
          Math.random() * this.obstacles.flying.yVariation;
    } else {
      yPos = CANVAS_HEIGHT - 32 - this.obstacles[type].height;
    }

    const obstacle = {
      type: type,
      x: CANVAS_WIDTH,
      y: yPos,
      width: this.obstacles[type].width,
      height: this.obstacles[type].height,
      passed: false,
      currentFrame: 0,
      frameCount: 0,
    };

    this.obstacles.active.push(obstacle);
    this.obstacles.nextTime =
      Math.random() *
        (this.obstacles[type].maxGap - this.obstacles[type].minGap) +
      this.obstacles[type].minGap;
  }

  updateScore() {
    const elapsedSeconds = Math.floor(
      (Date.now() - this.gameState.startTime) / 1000
    );
    if (elapsedSeconds > this.gameState.score) {
      this.gameState.score = elapsedSeconds;
      this.gameState.highScore = Math.max(
        this.gameState.score,
        this.gameState.highScore
      );
    }
    if (this.gameState.score > 0 && this.gameState.score % 3 === 0) {
      if (
        !this.gameState.lastSpeedIncrease ||
        this.gameState.lastSpeedIncrease < this.gameState.score
      ) {
        this.gameState.speed += 0.1;
        this.gameState.lastSpeedIncrease = this.gameState.score;
      }
    }
  }

  // === Game State Methods ===
  gameOver() {
    this.gameState.current = "gameover";
    this.dino.currentAnim = "idle";
    this.dino.isJumping = false;
    this.dino.isDucking = false;
    this.dino.y = CANVAS_HEIGHT - 83;
    this.dino.speedY = 0;
    this.obstacles.active = [];
    this.obstacles.timer = 0;
    this.obstacles.nextTime = 0;
  }

  resetGame() {
    this.gameState.current = "playing";
    this.gameState.speed = INITIAL_GAME_SPEED;
    this.gameState.score = 0;
    this.gameState.startTime = Date.now();
    this.dino.currentAnim = "run";
  }

  checkCollisions() {
    this.obstacles.active.forEach((obstacle) => {
      const obstLeft =
        obstacle.x + this.obstacles[obstacle.type].hitbox.xOffset;
      const obstTop = obstacle.y + this.obstacles[obstacle.type].hitbox.yOffset;
      const obstRight = obstLeft + this.obstacles[obstacle.type].hitbox.width;
      const obstBottom = obstTop + this.obstacles[obstacle.type].hitbox.height;
      const dinoHeight = this.dino.isDucking
        ? this.dino.duckHeight
        : this.dino.height;
      const dinoYOffset = this.dino.isDucking
        ? this.dino.normalHeight - this.dino.duckHeight
        : 0;

      if (
        this.dino.x < obstRight &&
        this.dino.x + this.dino.width > obstLeft &&
        this.dino.y + dinoYOffset < obstBottom &&
        this.dino.y + dinoYOffset + dinoHeight > obstTop
      ) {
        this.gameOver();
      }
    });
  }

  // === Input Handling ===
  setupInputHandlers() {
    // Keyboard controls
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        if (
          this.gameState.current === "start" ||
          this.gameState.current === "gameover"
        ) {
          this.resetGame();
          this.gameState.spaceKeyReleased = false;
        } else {
          this.dinoJump();
        }
      }

      if (
        e.code === "ArrowDown" &&
        this.gameState.current === "playing" &&
        !this.dino.isJumping
      ) {
        this.dinoDuck(true);
        this.gameState.downKeyPressed = true;
      }
    });

    document.addEventListener("keyup", (e) => {
      if (e.code === "Space") this.gameState.spaceKeyReleased = true;

      if (e.code === "ArrowDown") {
        if (
          this.gameState.downKeyPressed &&
          !this.dino.isJumping &&
          this.gameState.current === "playing"
        ) {
          this.dinoDuck(false);
        }
        this.gameState.downKeyPressed = false;
      }
    });

    // Touch controls for mobile
    if (IS_MOBILE) {
      let touchStartY = 0;
      let touchEndY = 0;
      let isSwipe = false;

      this.canvas.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          touchStartY = e.touches[0].clientY;
          isSwipe = false;
          if (
            this.gameState.current === "start" ||
            this.gameState.current === "gameover"
          ) {
            this.resetGame();
            return;
          }
        },
        { passive: false }
      );

      this.canvas.addEventListener(
        "touchmove",
        (e) => {
          e.preventDefault();
          touchEndY = e.touches[0].clientY;
          if (Math.abs(touchEndY - touchStartY) > MOBILE_JUMP_THRESHOLD * 2) {
            isSwipe = true;
            if (
              this.gameState.current === "playing" &&
              touchEndY > touchStartY
            ) {
              this.dinoDuck(true);
              this.gameState.downKeyPressed = true;
            }
          }
        },
        { passive: false }
      );

      this.canvas.addEventListener(
        "touchend",
        (e) => {
          e.preventDefault();
          if (this.gameState.current === "playing" && !isSwipe) {
            if (this.gameState.spaceKeyReleased) {
              this.dinoJump();
              this.gameState.spaceKeyReleased = false;
            }
          }
          if (this.gameState.downKeyPressed) {
            this.dinoDuck(false);
            this.gameState.downKeyPressed = false;
          }
          this.gameState.spaceKeyReleased = true;
        },
        { passive: false }
      );
    }
  }

  dinoJump() {
    if (
      !this.dino.isJumping &&
      this.gameState.spaceKeyReleased &&
      this.gameState.current === "playing"
    ) {
      this.dino.speedY = JUMP_FORCE;
      this.dino.isJumping = true;
      this.dino.jumpPeak = false;
      this.gameState.spaceKeyReleased = false;
    }
  }

  dinoDuck(isDucking) {
    if (this.gameState.current !== "playing") return;

    if (isDucking && !this.dino.isJumping) {
      this.dino.isDucking = true;
      this.dino.currentAnim = "duck";
    } else if (!isDucking && !this.dino.isJumping) {
      this.dino.isDucking = false;
      this.dino.currentAnim = "run";
    }
  }

  // === Mobile Orientation ===
  isPortrait() {
    if (window.screen.orientation) {
      return window.screen.orientation.type.includes("portrait");
    }
    return window.innerHeight > window.innerWidth;
  }

  showOrientationWarning(show) {
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
  }

  checkOrientation() {
    if (!IS_MOBILE) return;

    if (this.isPortrait()) {
      document.body.classList.add("portrait");
      document.body.classList.remove("landscape");
      this.showOrientationWarning(true);
    } else {
      document.body.classList.add("landscape");
      document.body.classList.remove("portrait");
      this.showOrientationWarning(false);
    }
    this.resizeCanvas();
  }

  resizeCanvas() {
    const container = document.getElementById("game-container");
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const aspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
    let newWidth = containerWidth;
    let newHeight = containerWidth / aspectRatio;

    if (newHeight > containerHeight) {
      newHeight = containerHeight;
      newWidth = containerHeight * aspectRatio;
    }

    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.canvas.style.width = `${newWidth}px`;
    this.canvas.style.height = `${newHeight}px`;

    this.canvas.style.position = "absolute";
    this.canvas.style.left = "50%";
    this.canvas.style.top = "50%";
    this.canvas.style.transform = "translate(-50%, -50%)";
  }

  // === Initialization ===
  initGame() {
    this.resizeCanvas();
    if (IS_MOBILE) {
      if (window.screen.orientation) {
        window.screen.orientation.addEventListener("change", () =>
          this.checkOrientation()
        );
      } else {
        window.addEventListener("resize", () =>
          setTimeout(() => this.checkOrientation(), 100)
        );
      }
      this.checkOrientation();
    }
    this.setupInputHandlers();
    this.loadAssets(() => this.gameLoop());
  }
}

// Initialize the game when the window loads
window.addEventListener("load", () => {
  new DinoGame();
});

// Global resize handler
window.addEventListener("resize", () => {
  if (window.dinoGameInstance) {
    window.dinoGameInstance.resizeCanvas();
    if (IS_MOBILE) window.dinoGameInstance.checkOrientation();
  }
});
