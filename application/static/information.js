/**
 * Creates a prompt header e.g. go from "vigor" to "workout"
 * @param {string} prompt
 * @returns {HTMLParagraphElement}
 */
function makePromptInfo(start_target) {
    let p = document.createElement("p");
    p.innerHTML = `go from <span class="link--starting">${start_target[0]}</span> to <span class="link--starting">${start_target[1]}</span>`;
    return p;
}

/**
 * @param {string} prompt
 * @returns {void}
 */
function renderToFrom(start_target){
    let information = /** @type {HTMLElement} */ (document.getElementById("information"));
    clearChildren(information);
    let promptInfoEl = makePromptInfo(start_target);
    information.append(promptInfoEl);
}

function renderFinish(jumpsA, streak) {
    gameOverModalEl = document.getElementById('gameOverModal')
    gameOverModalEl.style.display = 'flex';
    gameOverText = document.getElementById('gameOverText')
    // total = jumpsA.reduce((a, b) => a + b, 0)
    // get the 
    let stored = localStorage.getItem('jumpsA') || null;
    let jumps_array;
    console.log(stored);

    if (stored) {
        jumps_array = stored
            ? stored.split(',').map(s => parseInt(s.trim(), 10))  // Convert to integers
            : [];
    } else {
        jumps_array = [];
    }

    // Calculate sum, defaulting to 0 if empty
    let sum = jumps_array.reduce((acc, curr) => acc + (isNaN(curr) ? 0 : curr), 0);
    let jumps = parseInt(localStorage.getItem('jumps')) || 0;

    gameOverText.innerHTML = `You completed today's word.golf in ${sum + jumps} jumps. Streak: ${streak} days.`
}