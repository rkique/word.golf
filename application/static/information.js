HELP_FINISH_DELAY_MS = 500
START_GAME_DELAY_MS = 2000

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
    // console.log("renderToFrom called with start_target:");
    let information = /** @type {HTMLElement} */ (document.getElementById("information"));
    clearChildren(information);
    let promptInfoEl = makePromptInfo(start_target);
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

function displayModalText(innerHTML){
    const modalEl = document.getElementById('modal');
    clearChildren(modalEl);
    modalEl.innerHTML = innerHTML
    modalEl.style.display = 'flex';
}

function renderFinish(jumpsA) {
    const totalJumps = jumpsA.reduce((sum, jumps) => sum + jumps, 0);

    const currentDate = new Date(localStorage.getItem('current_date'));
    const lastCompleteDate = new Date(localStorage.getItem('lastComplete'));
    const diffInDays = Math.floor((currentDate - lastCompleteDate) / (1000 * 60 * 60 * 24)) || Infinity;

    const isSameDay = diffInDays === 0;
    const shouldResetStreak = diffInDays >= 2;

    const currentStreak = parseInt(localStorage.getItem('streak')) || 1;
    const newStreak = isSameDay ? currentStreak : shouldResetStreak ? 1 : currentStreak + 1;
    localStorage.setItem('streak', newStreak);
    update_database_with_finish(totalJumps, currentDate);
    finish_text = `
    <div id='finish-container' class='finish-container'> 

    <h1>Summary</h1>
    <div class="stat-row">
    <div><p class="stat">${totalJumps}</p> <p> jumps</p></div>
    <div><p class="stat">${newStreak}</p> <p>streak</p></div>
    </div>
    <button onclick="document.getElementById('modal').style.display='none'">Close</button> 

    </div>
    `;
    displayModalText(finish_text);
}

function startGame() {
    document.getElementById('modal').style.display = 'none';
    resp = sendAndReceiveXML('redirect=true');
    renderLinks(resp.prompt, resp.results)
    renderToFrom(resp.prompt);
    console.log('[reportSessionEnded] Rendering prompts..')
    renderPrompts(resp.prompts, resp.i, resp.jumpsA, resp.jumps)
    activateLinks()
}

function renderHelpFinish(){
    help_finish_text = `<p>Good luck!</p><div id="dots-container" class="dots-container"><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div>`;

    localStorage.setItem('is_help', 'false');
    localStorage.removeItem('jumps');
    localStorage.removeItem('jumpsA');
    localStorage.removeItem('prompt');
    localStorage.removeItem('prompts');
    localStorage.removeItem('results');

    setTimeout(() => {
        displayModalText(help_finish_text);
        setTimeout(startGame, START_GAME_DELAY_MS);
    }, HELP_FINISH_DELAY_MS);
}