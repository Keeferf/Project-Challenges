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
    this.gameTime = 0;
    this.startTime = 0;
    this.timerInterval = null;
    this.wordCache = [];
    this.isFetchingWords = false;

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
    this.preloadWords();
  }

  async preloadWords() {
    try {
      this.isFetchingWords = true;
      // Fetch common English words with 4-8 letters
      const response = await fetch(
        `https://api.datamuse.com/words?sp=????,?????,??????,???????,????????&md=f&max=200`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        // Filter to only include words with frequency data and good length
        this.wordCache = data
          .filter((item) => item.word && item.tags && item.tags.includes("f:1"))
          .map((item) => item.word)
          .filter((word) => word.length >= 4 && word.length <= 8);

        // If we didn't get enough words, add fallback
        if (this.wordCache.length < 50) {
          this.wordCache = [...this.wordCache, ...this.fallbackWordList];
        }
      } else {
        this.wordCache = [...this.fallbackWordList];
      }
    } catch (error) {
      console.error("Failed to fetch words from Datamuse:", error);
      this.wordCache = [...this.fallbackWordList];
    } finally {
      this.isFetchingWords = false;
    }
  }

  async getRandomWord() {
    // If we have words in cache, use them
    if (this.wordCache.length > 0) {
      return this.wordCache[Math.floor(Math.random() * this.wordCache.length)];
    }

    // If cache is empty but we're still fetching, wait a bit
    if (this.isFetchingWords) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this.getRandomWord(); // Try again
    }

    // If all else fails, use fallback
    return this.fallbackWordList[
      Math.floor(Math.random() * this.fallbackWordList.length)
    ];
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
    const totalSeconds = this.gameTime / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.floor((this.gameTime % 1000) / 10); // Show 2-digit ms
    this.timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`;
  }

  updateGameTime(timestamp) {
    if (!this.gameActive) return;

    this.gameTime = timestamp - this.startTime;
    this.updateTimer();
    this.timerInterval = requestAnimationFrame(this.updateGameTime.bind(this));
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
    this.startTime = performance.now();
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

    // Start high-precision timer
    this.startTime = performance.now();
    this.timerInterval = requestAnimationFrame(this.updateGameTime.bind(this));

    this.wordSpawnInterval = setInterval(
      () => this.spawnWord(),
      this.spawnRate
    );
    this.gameLoop = setInterval(() => this.updateGameState(), 30);
  }

  async spawnWord() {
    if (!this.gameActive) return;

    const randomWord = await this.getRandomWord();
    const wordElement = document.createElement("div");
    wordElement.className = "word";
    wordElement.textContent = randomWord;
    wordElement.style.fontSize = `${this.wordFontSize}px`;

    // Add to DOM first to measure dimensions
    wordElement.style.position = "absolute";
    this.gameArea.appendChild(wordElement);

    const wordWidth = wordElement.offsetWidth;
    const wordHeight = wordElement.offsetHeight;

    // Calculate spawn position
    const maxLeft = this.gameWidth - wordWidth;
    const leftPos = Math.max(0, Math.floor(Math.random() * maxLeft));
    const topPos = 0; // Start at the very top

    wordElement.style.left = `${leftPos}px`;
    wordElement.style.top = `${topPos}px`;

    this.activeWords.push({
      element: wordElement,
      text: randomWord,
      y: topPos, // Track absolute position
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
      word.y += this.wordSpeed; // Move downward
      word.element.style.top = `${word.y}px`; // Update position

      // Check if word reached danger zone
      if (word.y + word.height > this.gameAreaHeight - this.dangerZoneHeight) {
        this.handleMissedWord(i);
      }
    }

    // Increase difficulty
    this.wordSpeed = 1.5 + Math.floor(this.score / 100) * 0.2;
    this.spawnRate = Math.max(500, 2000 - Math.floor(this.score / 50) * 100);
  }

  handleMissedWord(index) {
    const word = this.activeWords[index];
    this.gameArea.removeChild(word.element);
    this.activeWords.splice(index, 1);

    this.dangerZoneHeight += this.dangerZoneIncrement;
    this.maxDangerZone = Math.max(this.maxDangerZone, this.dangerZoneHeight);
    this.updateDangerZone();

    if (this.dangerZoneHeight >= this.gameAreaHeight * 0.9) {
      this.gameOver();
    }
  }

  gameOver() {
    this.gameActive = false;
    clearInterval(this.wordSpawnInterval);
    clearInterval(this.gameLoop);
    cancelAnimationFrame(this.timerInterval);

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

  formatTime(milliseconds) {
    const totalSeconds = milliseconds / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const ms = Math.floor((milliseconds % 1000) / 10); // 2-digit milliseconds
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  }

  resetGame() {
    this.gameActive = false;
    clearInterval(this.wordSpawnInterval);
    clearInterval(this.gameLoop);
    cancelAnimationFrame(this.timerInterval);

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
