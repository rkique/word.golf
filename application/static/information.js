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
    console.log("renderToFrom called with start_target:");
    let information = /** @type {HTMLElement} */ (document.getElementById("information"));
    console.log("here is the information");
    console.log(information);
    clearChildren(information);
    console.log("here is the start_target");
    console.log(start_target);
    let promptInfoEl = makePromptInfo(start_target);
    console.log("here is the promptInfoEl");
    console.log(promptInfoEl);
    information.append(promptInfoEl);
}

function renderFinish(jumpsA) {
    const gameOverModalEl = document.getElementById('gameOverModal');
    const gameOverText = document.getElementById('gameOverText');
    gameOverModalEl.style.display = 'flex';

    const totalJumps = jumpsA.reduce((sum, jumps) => sum + jumps, 0);

    const currentDate = new Date(localStorage.getItem('current_date'));
    const lastCompleteDate = new Date(localStorage.getItem('lastComplete'));
    const diffInDays = Math.floor((currentDate - lastCompleteDate) / (1000 * 60 * 60 * 24)) || Infinity;

    const isSameDay = diffInDays === 0;
    const shouldResetStreak = diffInDays >= 2;

    const currentStreak = parseInt(localStorage.getItem('streak')) || 1;
    const newStreak = isSameDay ? currentStreak : shouldResetStreak ? 1 : currentStreak + 1;

    localStorage.setItem('streak', newStreak);

    gameOverText.innerHTML = `You completed today's word.golf in ${totalJumps} jumps. Streak: ${newStreak} days.`;
}