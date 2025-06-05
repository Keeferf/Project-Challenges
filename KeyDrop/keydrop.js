class WordTypingGame {
  constructor() {
    // DOM elements
    this.gameContainer = document.getElementById("game-container");
    this.wordInput = document.getElementById("word-input");
    this.scoreElement = document.getElementById("score");
    this.timerElement = document.getElementById("timer");
    this.startButton = document.getElementById("start-button");
    this.resetButton = document.getElementById("reset-button");
    this.gameArea = document.getElementById("game-area");

    // Game state
    this.score = 0;
    this.gameActive = false;
    this.activeWords = [];
    this.wordSpeed = 1.5;
    this.spawnRate = 2000;
    this.wordFontSize = 24;
    this.dangerZoneHeight = 0;
    this.maxDangerZone = 0;
    this.dangerZoneIncrement = 10;
    this.gameTime = 0; // in seconds
    this.timerInterval = null;

    // Initialize dimensions
    this.updateDimensions();

    // Game settings
    this.wordList = [
      "apple",
      "banana",
      "cherry",
      "date",
      "elderberry",
      "fig",
      "grape",
      "honeydew",
      "kiwi",
      "lemon",
      "mango",
      "nectarine",
      "orange",
      "pear",
      "quince",
      "raspberry",
      "strawberry",
      "tangerine",
      "watermelon",
      "blueberry",
      "blackberry",
      "cantaloupe",
      "coconut",
      "dragonfruit",
      "guava",
      "jackfruit",
      "lime",
      "lychee",
      "passionfruit",
      "persimmon",
    ];

    // Initialize
    this.initEventListeners();
    this.setupGameArea();
  }

  updateDimensions() {
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    this.gameWidth = this.viewportWidth * 0.6;
    this.gameHeight = this.viewportHeight * 0.7;
    this.gameAreaHeight = this.gameHeight - 20;

    this.gameArea.style.width = `${this.gameWidth}px`;
    this.gameArea.style.height = `${this.gameHeight}px`;

    this.wordFontSize = Math.max(16, Math.min(28, this.gameWidth * 0.04));
  }

  setupGameArea() {
    this.dangerZone = document.createElement("div");
    this.dangerZone.id = "danger-zone";
    this.gameArea.appendChild(this.dangerZone);
    this.updateDangerZone();
  }

  updateDangerZone() {
    this.dangerZone.style.height = `${this.dangerZoneHeight}px`;
    this.dangerZone.style.bottom = "0";
  }

  updateTimer() {
    const minutes = Math.floor(this.gameTime / 60);
    const seconds = this.gameTime % 60;
    this.timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  initEventListeners() {
    this.startButton.addEventListener("click", () => this.startGame());
    this.resetButton.addEventListener("click", () => this.resetGame());
    this.wordInput.addEventListener("input", () => this.checkInput());
    this.wordInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.wordInput.value = "";
    });

    window.addEventListener("resize", () => {
      this.updateDimensions();
      this.activeWords.forEach((word) => {
        word.element.style.fontSize = `${this.wordFontSize}px`;
      });
    });
  }

  startGame() {
    this.gameActive = true;
    this.score = 0;
    this.gameTime = 0;
    this.dangerZoneHeight = 0;
    this.maxDangerZone = 0;
    this.scoreElement.textContent = this.score;
    this.updateTimer();
    this.activeWords = [];
    this.wordInput.value = "";
    this.wordInput.focus();

    document.querySelectorAll(".word, .game-over").forEach((el) => el.remove());
    this.updateDangerZone();

    this.startButton.style.display = "none";
    this.resetButton.style.display = "inline-block";

    // Start timer
    this.timerInterval = setInterval(() => {
      this.gameTime++;
      this.updateTimer();
    }, 1000);

    this.wordSpawnInterval = setInterval(
      () => this.spawnWord(),
      this.spawnRate
    );
    this.gameLoop = setInterval(() => this.updateGameState(), 30);
  }

  spawnWord() {
    if (!this.gameActive) return;

    const randomWord =
      this.wordList[Math.floor(Math.random() * this.wordList.length)];
    const wordElement = document.createElement("div");
    wordElement.className = "word";
    wordElement.textContent = randomWord;
    wordElement.style.fontSize = `${this.wordFontSize}px`;

    wordElement.style.visibility = "hidden";
    wordElement.style.position = "absolute";
    this.gameArea.appendChild(wordElement);

    const wordWidth = wordElement.offsetWidth;
    const wordHeight = wordElement.offsetHeight;

    const maxLeft = this.gameWidth - wordWidth;
    const leftPos = Math.max(
      0,
      Math.min(Math.floor(Math.random() * maxLeft), maxLeft)
    );

    const minTop = this.dangerZoneHeight + wordHeight;
    const maxTop = this.gameAreaHeight - wordHeight;
    const topPos = Math.max(minTop, Math.min(this.scoreAreaHeight, maxTop));

    wordElement.style.left = `${leftPos}px`;
    wordElement.style.top = `${topPos}px`;
    wordElement.style.visibility = "visible";

    this.activeWords.push({
      element: wordElement,
      text: randomWord,
      y: topPos - this.scoreAreaHeight,
      x: leftPos,
      width: wordWidth,
      height: wordHeight,
    });
  }

  checkInput() {
    if (!this.gameActive) return;

    const currentInput = this.wordInput.value.trim().toLowerCase();

    for (let i = 0; i < this.activeWords.length; i++) {
      const word = this.activeWords[i];

      if (word.text.toLowerCase() === currentInput) {
        this.score += 10;
        this.scoreElement.textContent = this.score;

        word.element.classList.add("correct");
        setTimeout(() => {
          this.gameArea.removeChild(word.element);
          this.activeWords.splice(i, 1);
        }, 200);

        this.wordInput.value = "";
        return;
      }
    }
  }

  updateGameState() {
    if (!this.gameActive) return;

    for (let i = 0; i < this.activeWords.length; i++) {
      const word = this.activeWords[i];
      word.y += this.wordSpeed;

      if (word.y + word.height >= this.gameAreaHeight - this.dangerZoneHeight) {
        this.gameArea.removeChild(word.element);
        this.activeWords.splice(i, 1);
        i--;

        this.dangerZoneHeight += this.dangerZoneIncrement;
        this.maxDangerZone = Math.max(
          this.maxDangerZone,
          this.dangerZoneHeight
        );
        this.updateDangerZone();

        if (this.dangerZoneHeight >= this.gameAreaHeight * 0.9) {
          this.gameOver();
        }
      } else {
        word.element.style.top = `${word.y + this.scoreAreaHeight}px`;
      }
    }

    this.wordSpeed = 1.5 + Math.floor(this.score / 100) * 0.2;
    this.spawnRate = Math.max(500, 2000 - Math.floor(this.score / 50) * 100);
  }

  gameOver() {
    this.gameActive = false;
    clearInterval(this.wordSpawnInterval);
    clearInterval(this.gameLoop);
    clearInterval(this.timerInterval);

    const gameOverElement = document.createElement("div");
    gameOverElement.className = "game-over";
    gameOverElement.innerHTML = `
      GAME OVER<br>
      <span style="font-size: ${this.wordFontSize}px">Score: ${this.score}</span><br>
      <span style="font-size: ${this.wordFontSize}px">Time: ${this.formatTime(this.gameTime)}</span><br>
      <span style="font-size: ${this.wordFontSize * 0.8}px">Lava reached ${Math.floor((this.maxDangerZone / this.gameAreaHeight) * 100)}%</span>
    `;
    this.gameContainer.appendChild(gameOverElement);
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  resetGame() {
    this.gameActive = false;
    clearInterval(this.wordSpawnInterval);
    clearInterval(this.gameLoop);
    clearInterval(this.timerInterval);

    this.score = 0;
    this.gameTime = 0;
    this.dangerZoneHeight = 0;
    this.scoreElement.textContent = this.score;
    this.updateTimer();
    this.activeWords = [];
    this.wordInput.value = "";

    document.querySelectorAll(".word, .game-over").forEach((el) => el.remove());
    this.updateDangerZone();

    this.startButton.style.display = "inline-block";
    this.resetButton.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const game = new WordTypingGame();
});
