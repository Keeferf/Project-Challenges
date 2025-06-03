// Game Class
class WordTypingGame {
  constructor() {
    // DOM elements
    this.gameContainer = document.getElementById("game-container");
    this.wordInput = document.getElementById("word-input");
    this.scoreElement = document.getElementById("score");
    this.startButton = document.getElementById("start-button");
    this.resetButton = document.getElementById("reset-button");

    // Game state
    this.score = 0;
    this.gameActive = false;
    this.words = [];
    this.wordSpeed = 2.5;
    this.wordInterval = 1800;
    this.gameWidth = this.gameContainer.offsetWidth;
    this.gameHeight = 800;
    this.scoreAreaHeight = 50;

    // Word dictionary
    this.wordDictionary = [
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
      "javascript",
      "html",
      "css",
      "python",
      "java",
      "ruby",
      "php",
      "swift",
      "react",
      "angular",
      "vue",
      "node",
      "express",
      "mongodb",
      "mysql",
    ];

    // Initialize event listeners
    this.initEventListeners();
  }

  initEventListeners() {
    this.startButton.addEventListener("click", () => this.startGame());
    this.resetButton.addEventListener("click", () => this.resetGame());
    this.wordInput.addEventListener("keydown", (e) => this.handleInput(e));
    window.addEventListener("resize", () => {
      this.gameWidth = this.gameContainer.offsetWidth;
      this.gameHeight = this.gameContainer.offsetHeight;
    });
  }

  startGame() {
    // Reset game state
    this.gameActive = true;
    this.score = 0;
    this.scoreElement.textContent = this.score;
    this.words = [];

    // Clear only word elements, not the entire container
    const wordElements = document.querySelectorAll(".word");
    wordElements.forEach((el) => el.remove());

    this.wordInput.value = "";
    this.wordInput.focus();

    // UI changes
    this.startButton.style.display = "none";
    this.resetButton.style.display = "inline-block";

    // Start word generation
    this.wordGenerator = setInterval(
      () => this.generateWord(),
      this.wordInterval
    );

    // Start game loop
    this.gameLoop = setInterval(() => this.updateGame(), 30);
  }

  resetGame() {
    // Clear intervals
    clearInterval(this.wordGenerator);
    clearInterval(this.gameLoop);

    // Reset UI
    this.gameActive = false;

    // Clear only word elements
    const wordElements = document.querySelectorAll(".word");
    wordElements.forEach((el) => el.remove());

    this.wordInput.value = "";
    this.startButton.style.display = "inline-block";
    this.resetButton.style.display = "none";
  }

  handleInput(e) {
    if (e.key === "Enter" && this.gameActive) {
      const typedWord = this.wordInput.value.trim().toLowerCase();
      this.wordInput.value = "";

      let wordFound = false;
      for (let i = 0; i < this.words.length; i++) {
        if (this.words[i].text.toLowerCase() === typedWord) {
          // Mark word as correct and remove after animation
          this.words[i].element.classList.add("correct");
          setTimeout(() => {
            this.gameContainer.removeChild(this.words[i].element);
            this.words.splice(i, 1);
          }, 100);

          this.score += 10;
          this.scoreElement.textContent = this.score;
          wordFound = true;
          break;
        }
      }

      if (!wordFound) {
        // Penalty for wrong word
        this.score = Math.max(0, this.score - 5);
        this.scoreElement.textContent = this.score;
        this.wordInput.classList.add("shake");
        setTimeout(() => this.wordInput.classList.remove("shake"), 500);
      }
    }
  }

  generateWord() {
    if (!this.gameActive) return;

    // Get random word
    const randomWord =
      this.wordDictionary[
        Math.floor(Math.random() * this.wordDictionary.length)
      ];

    // Create word element
    const wordElement = document.createElement("div");
    wordElement.className = "word";
    wordElement.textContent = randomWord;

    // Add to game container first to measure its width
    this.gameContainer.appendChild(wordElement);

    // Calculate maximum left position based on actual word width
    const wordWidth = wordElement.offsetWidth;
    const maxLeft = this.gameWidth - wordWidth;

    // Random horizontal position
    const leftPos = Math.floor(Math.random() * maxLeft);
    wordElement.style.left = `${leftPos}px`;
    wordElement.style.top = `${this.scoreAreaHeight}px`; // Start below score area

    // Store word in array
    this.words.push({
      text: randomWord,
      element: wordElement,
      y: 0, // Start at 0 (relative to play area)
      x: leftPos,
    });
  }

  updateGame() {
    if (!this.gameActive) return;

    // Move all words down
    for (let i = 0; i < this.words.length; i++) {
      const word = this.words[i];
      word.y += this.wordSpeed;
      word.element.style.top = `${word.y + this.scoreAreaHeight}px`; // Add score area offset

      // Check if word reached bottom (using gameHeight which is 800)
      if (word.y > this.gameHeight - word.element.offsetHeight) {
        this.gameContainer.removeChild(word.element);
        this.words.splice(i, 1);
        i--;

        // Penalty for missed word
        this.score = Math.max(0, this.score - 15);
        this.scoreElement.textContent = this.score;

        // Game over condition
        if (this.score <= 0) {
          this.gameOver();
        }
      }
    }
  }

  gameOver() {
    this.gameActive = false;
    clearInterval(this.wordGenerator);
    clearInterval(this.gameLoop);

    // Show game over message
    const gameOverElement = document.createElement("div");
    gameOverElement.className = "game-over";
    gameOverElement.textContent = "GAME OVER";
    this.gameContainer.appendChild(gameOverElement);
  }
}

// Initialize the game when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const game = new WordTypingGame();
});
