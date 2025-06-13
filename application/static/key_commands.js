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
  }
});