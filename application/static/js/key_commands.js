/* closes the help dialog when the Escape key is pressed */

document.addEventListener('keydown', function (event) {
  const helpEl = document.getElementById('help');
  if (event.key === 'Escape' && getComputedStyle(helpEl).display === 'flex') {
    helpEl.style.display = 'none';
  }
});

/* starts the game when the Escape key is pressed if tutorial is on */
document.addEventListener('keydown', function (event) {
  const helpEl = document.getElementById('help');
  const isHelp = localStorage.getItem('is_help') === 'true';
  const isHidden = getComputedStyle(helpEl).display === 'none';

  if (event.key === 'Escape') {
    if (!isHidden) {
      helpOff(); // Close help if it's open
    } else if (isHelp) {
      startGame(); // Start game if help is hidden and flag is set
    }
    else if (location.hostname === "localhost" || location.hostname.startsWith("127.")) {
        const gameState = {
        "current_prompt": "5",
        "current_date": "2025-06-19",
        "jumps": "2",
        "daily_idx": "19",
        "jumpsA": "[2,2,2,2,2]",
        "prompts": "[[\"fracture\",\"impatience\"],[\"eyebrow\",\"haunt\"],[\"album\",\"stain\"],[\"frown\",\"windshield\"],[\"stubbornness\",\"anticipation\"]]",
        "previous_words": "[\"discomfort\",\"impatience\",\"specter\",\"haunt\",\"label\",\"stain\",\"forehead\",\"windshield\",\"wariness\",\"anticipation\"]",
        "results": "[\"astonishment\",\"wariness\",\"anxiety\",\"trepidation\",\"excitement\",\"amid\",\"preparation\",\"giddiness\",\"braced\",\"euphoria\",\"anticipation\",\"eagerly\",\"expectation\",\"impending\",\"frenzy\",\"nervousness\",\"anxiously\",\"dread\",\"uncertainty\",\"crescendo\",\"await\"]",
        "lastComplete": "2025-06-19",
        "logged_in": "eriq",
        "is_help": "false",
        "streak": "1"
      };
      Object.entries(gameState).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
      reportSessionEnded(true);
    }
  }
});