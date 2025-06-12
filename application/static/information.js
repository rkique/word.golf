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


function update_database_with_finish(totalJumps, last_complete) {
    let words_selected = string_to_list(localStorage.getItem('previous_words') || null);
    let jumpsA = string_to_list(localStorage.getItem('jumpsA') || null);
    jumpsA = jumpsA.map(jump => parseInt(jump, 10));
    let last_jumps = parseInt(localStorage.getItem('jumps') || 0);
    jumpsA.push(last_jumps);

    const backendURL = "http://localhost:7000" // testing 
    // const backendURL = "https://word-golf-backend.onrender.com"; // production 

    // for testing purposes only, delete this line in production
    // last_complete = new Date(last_complete);
    // last_complete.setDate(last_complete.getDate() + 4);

    const data = {
        total_jumps: totalJumps,
        last_complete: last_complete, // should be "YYYY-MM-DD"
        words_selected: words_selected,
        jumpsA: jumpsA,
    };

    fetch(backendURL + '/update_finish', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include', // <-- Required for auth cookies
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Database updated successfully:', data);
    })
    .catch((error) => {
        console.error('Error updating database:', error);
    });
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

    // update the database with the new streak as well as last_complete date
    update_database_with_finish(totalJumps, currentDate);

    gameOverText.innerHTML = `You completed today's word.golf in ${totalJumps} jumps. Streak: ${newStreak} days.`;
}