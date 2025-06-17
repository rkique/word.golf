HELP_FINISH_DELAY_MS = 500
START_GAME_DELAY_MS = 1500

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
    let words_selected = JSON.parse((localStorage.getItem('previous_words') || null))
    let jumpsA = JSON.parse((localStorage.getItem('jumpsA') || null));
    jumpsA = jumpsA.map(jump => parseInt(jump, 10));
    let last_jumps = parseInt(localStorage.getItem('jumps') || 0);
    jumpsA.push(last_jumps);
    localStorage.setItem('jumpsA', JSON.stringify(jumpsA));
    // for testing purposes only, delete this line in production
    // last_complete = new Date(last_complete);
    // last_complete.setDate(last_complete.getDate() + 4);

    const data = {
        total_jumps: totalJumps,
        last_complete: last_complete, // should be "YYYY-MM-DD"
        words_selected: words_selected,
        jumpsA: jumpsA,
    };

    fetch(window.backendURL + '/update_finish', {
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

function displayHelpFinish(innerHTML){
    const modalEl = document.getElementById('modal');
    const modalText =  document.getElementById('modalText');
    modalText.innerHTML = innerHTML;
    modalEl.style.display = 'flex';
}

function daysSinceStartDate(startDateStr = '2025-05-31', storageKey = 'current_date') {
    const currentDateStr = localStorage.getItem(storageKey);
    if (!currentDateStr) return null;

    const startDate = new Date(startDateStr);
    const currentDate = new Date(currentDateStr);
    const diffMs = currentDate - startDate;

    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
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
    const daily_idx = daysSinceStartDate();
    // Display finish modal for user.
    displayFinishModal(daily_idx, totalJumps, newStreak, false);
}

/* Clears the modal, localStorage, and renders links*/
function startGame() {
    document.getElementById('modal').style.display = 'none';
    localStorage.setItem('is_help', 'false');
    localStorage.removeItem('jumps');
    localStorage.removeItem('jumpsA');
    localStorage.removeItem('prompt');
    localStorage.removeItem('prompts');
    localStorage.removeItem('results');
    resp = sendAndReceiveXML('redirect=true');
    renderLinks(resp.prompt, resp.results)
    renderToFrom(resp.prompt);
    // console.log('[reportSessionEnded] Rendering prompts..')
    renderPrompts(resp.prompts, resp.i, resp.jumpsA, resp.jumps)
    activateLinks()
    //stash
}

function generateLineGraph(scores) {
    localStorage.setItem('jumpsA', JSON.stringify(scores));
    const graphContainer = document.getElementById("scoresGraph");
    if (!graphContainer) return;
    const rootStyles = getComputedStyle(document.documentElement);
    const axisLineColor = rootStyles.getPropertyValue('--border-color') || '#cccccc';

    const trace = {
        x: scores.map((_, i) => i + 1),
        y: scores,
        type: 'scatter',
        mode: 'lines+markers',
        hoverinfo: 'y',
        hoverlabel: {
            bgcolor: rootStyles.getPropertyValue('--background-color'),
            font: {
                color: rootStyles.getPropertyValue('--text-color'),
                size: 14
            },
            bordercolor: rootStyles.getPropertyValue('--grayed-out-color')
        },
        line: {
            color: rootStyles.getPropertyValue('--border-color'),
            width: 3
        },
        marker: {
            color: rootStyles.getPropertyValue('--hover-color'),
            size: 10,
            opacity: 0.6
        }
    };

    const layout = {
        height: window.innerHeight * 0.4,
        width: window.innerWidth * 0.4,
        dragmode: false,
        xaxis: {
            visible: true,
            autorange: true,
            showline: true,
            linecolor: axisLineColor,
            linewidth: 1,
            mirror: true
        },
        yaxis: {
            visible: true,
            range: [0,6],
            showline: true,
            linecolor: axisLineColor,
            linewidth: 1,
            mirror: true
        },
        plot_bgcolor: rootStyles.getPropertyValue('--background-color') || '#ffffff',
        paper_bgcolor: rootStyles.getPropertyValue('--background-color') || '#ffffff',
    };

    const config = {
        displayModeBar: false,
        displaylogo: false,
        responsive: true,
        scrollZoom: false,
        doubleClick: false,
        staticPlot: false
    };

    Plotly.newPlot(graphContainer, [trace], layout, config);
}


function displayFinishModal(daily_idx, totalJumps, currentStreak, is_user=false) {
    const modalFinish = document.getElementById(is_user ? 'modal-finish-user' : 'modal-finish-guest');

    modalFinish.querySelector('.daily-idx').innerHTML = daily_idx;
    modalFinish.querySelector('.daily-idx').innerHTML = daily_idx;
    modalFinish.querySelector('.totalJumps').innerHTML = totalJumps;
    modalFinish.querySelector('.streak').innerHTML = currentStreak;
    modalFinish.style.display = "flex";
    if (is_user){
        jumpsArray = JSON.parse(localStorage.getItem('jumpsA') || null);
        generateLineGraph(jumpsArray);
    }
}

function renderHelpFinish(){
    help_finish_text = `Good luck!`;

    setTimeout(() => {
        displayHelpFinish(help_finish_text);
        setTimeout(startGame, START_GAME_DELAY_MS);
    }, HELP_FINISH_DELAY_MS);
}