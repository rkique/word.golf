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

  if (event.key === 'Escape' && (location.hostname === "localhost" || location.hostname.startsWith("127."))) {
    if (!isHidden) {
      helpOff(); 
    } else if (isHelp) {
      resp = sendAndReceiveXML('help_end=true')
      runAfterBannerDisappears(() => {renderHelpFinish()})
      tallyPrompts(resp.prompts, [3,2], resp.jumps)
      startGame(); 
    }
  }
});