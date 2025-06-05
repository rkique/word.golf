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

function renderFinish(jumpsA, streak){
    gameOverModalEl = document.getElementById('gameOverModal')
    gameOverModalEl.style.display = 'flex';
    gameOverText = document.getElementById('gameOverText')
    total = jumpsA.reduce((a, b) => a + b, 0)
    gameOverText.innerHTML = `You completed today's word.golf in ${total} jumps.`
    // `. Streak: ${streak} days.`
}