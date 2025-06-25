HELP_FINISH_DELAY_MS = 500
START_GAME_DELAY_MS = 1500

/**
 * Creates a prompt header e.g. go from "vigor" to "workout"
 * @param {string} prompt
 * @returns {HTMLParagraphElement}
 */
function makePromptInfo(start_target) {
    let p = document.createElement("p");
    // p.innerHTML = `go from <span class="link--starting">${start_target[0]}</span> to <span class="link--starting">${start_target[1]}</span>`;
    p.innerHTML = ''
    return p;
}

/**
 * @param {string} prompt
 * @returns {void}
 */
function renderToFrom(start_target, jumps){
    if (jumps != 0){
        
        let previous_words = JSON.parse(localStorage.getItem('previous_words'))
        // let previous_words = game_data.selected_words;
    
        let previous_word = previous_words.length > 0 ? previous_words[previous_words.length - 1] : start_target[0];
        start_target = [previous_word, start_target[1]];

    }
    let information = /** @type {HTMLElement} */ (document.getElementById("information"));
    clearChildren(information);
    let promptInfoEl = makePromptInfo(start_target);
    information.append(promptInfoEl);
}


// function update_database_with_finish(last_complete) {
//     // show that the game has finished (I think this is the correct way/method to do so )
//     let words_selected = JSON.parse((localStorage.getItem('previous_words') || null))
//     let jumpsA = JSON.parse((localStorage.getItem('jumpsA') || null));
//     jumpsA = jumpsA.map(jump => parseInt(jump, 10));
//     let last_jumps = parseInt(localStorage.getItem('jumps') || 0);
//     jumpsA.push(last_jumps);
//     localStorage.setItem('jumpsA', JSON.stringify(jumpsA));

//     const data = {
//         last_complete: last_complete, // should be "YYYY-MM-DD"
//     };

//     fetch(window.backendURL + '/update_finish', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         credentials: 'include', // <-- Required for auth cookies
//         body: JSON.stringify(data)
//     })
//     .then(response => response.json())
//     .then(data => {
//         console.log('Database updated successfully:', data);
//     })
//     .catch((error) => {
//         console.error('Error updating database:', error);
//     });
// }

function displayModal(innerHTML){
    const modalEl = document.getElementById('modal');
    modalEl.innerHTML = innerHTML;
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

function renderGrid(counts) {
    const full = '■';
    const empty = '□';
    const numRows = 5;
    const numCols = 6;
    let gridMessage = ''
    for (let row = 0; row < numRows; row++) {
        let count = Math.ceil(counts[row] / 2)
        let line = full.repeat(count) + empty.repeat(numCols - count);
        gridMessage += line + '\n';
    }
    return gridMessage;
}


function renderFinish(jumpsA) {
    // const totalJumps = jumpsA.reduce((sum, jumps) => sum + jumps, 0);

    const currentDate = new Date(localStorage.getItem('current_date'));
    // const lastCompleteDate = new Date(localStorage.getItem('lastComplete'));
    // const diffInDays = Math.floor((currentDate - lastCompleteDate) / (1000 * 60 * 60 * 24))
    
    // const isSameDay = diffInDays === 0;
    // const shouldResetStreak = diffInDays >= 2;

    // const currentStreak = parseInt(localStorage.getItem('streak')) || 1;
    // const newStreak = isSameDay ? currentStreak : shouldResetStreak ? 1 : currentStreak + 1;

    const data = {
        last_complete: currentDate, // should be "YYYY-MM-DD"
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
    .then(finish_data => {
        // console.log('Database updated successfully:', finish_data);
        const daily_idx = daysSinceStartDate();
        // Display finish modal for user.
        is_logged_in = Boolean(localStorage.getItem('logged_in'))
        jumpsGridMessage = renderGrid(finish_data.jumpsA);
        displayFinishModal(daily_idx, finish_data.total_jumps, finish_data.newStreak, jumpsGridMessage, is_logged_in);
    })
    .catch((error) => {
        console.error('Error updating database:', error);
    });

    // localStorage.setItem('streak', newStreak);
    // update_database_with_finish(totalJumps, currentDate);
    
}

/* Clears the modal, localStorage, and renders links with XML redirect=true*/
function startGame() {
    document.getElementById('modal').style.display = 'none';
    localStorage.setItem('is_help', 'false');
    localStorage.removeItem('jumps');
    localStorage.removeItem('jumpsA');
    localStorage.removeItem('prompts');
    localStorage.removeItem('results');
    resp = sendAndReceiveXML('redirect=true');
    _ = send_game_data_to_backend(resp, 'redirect=true');
    clearBoxes()
    renderLinks(resp.prompt, resp.results)
    renderToFrom(resp.prompt, 0);
    start_target = resp.prompts[resp.i]
    renderPrompts(resp.prompts, resp.i, resp.jumpsA, resp.jumps, start_target=start_target, serialize=false)
    activateLinks()
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

function displayFinishModal(daily_idx, totalJumps, currentStreak, jumpsGridMessage, is_user=false) {
    const modalFinish = document.getElementById(is_user ? 'modal-finish-user' : 'modal-finish-guest');
    modalFinish.querySelector('.daily-idx').innerHTML = daily_idx;
    modalFinish.querySelector('.daily-idx').innerHTML = daily_idx;
    modalFinish.querySelector('.totalJumps').innerHTML = totalJumps;
    modalFinish.querySelector('.streak').innerHTML = currentStreak;
    modalFinish.style.display = "flex";

    const tweetMessage = `www.word.golf #${daily_idx} ${totalJumps} \n${jumpsGridMessage}`;
    const shareLink = modalFinish.querySelector('#shareLink');
    shareLink.addEventListener('click', () => {
        navigator.clipboard.writeText(tweetMessage)
            .then(() => {
                shareLink.textContent = 'Copied to clipboard!';
                setTimeout(() => shareLink.innerHTML = 
                `
                Share <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-copy">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> 
                `, 2000);
            })
            .catch(err => {
                shareLink.textContent = 'Failed to copy';
                console.error('Clipboard write failed:', err);
            });
    });

    if (is_user) {
        fetch('/solutions')
            .then(response => response.json())
            .then(json => {
                localStorage.setItem('solutions', JSON.stringify(json));
                function formatSequences(sequences) {
                    return sequences.map(seq =>
                        `<div><p>${seq.join(' ⟶ ')}</p></div>`
                    ).join('\n');
                }
                const modalFinish = document.querySelector('.modal-finish'); // adjust if needed
                modalFinish.querySelector('.solutions').innerHTML =
                    `<p class="solutions-text">${formatSequences(json)}</p>`;
            });
    }
}

function beginTutorial() {
    localStorage.setItem('is_help', 'true');
    help = document.getElementById('help');
    help.style.display = 'none'
    resp = sendAndReceiveXML(`help=true`)
    renderToFrom(resp.prompt, resp.jumps);
    document.querySelector('.prompt-box').style.border = '1px solid var(--border-color)';
    // console.log(`renderLinks: ${renderLinks}`)
    renderLinks(resp.prompt, resp.results, resp.i)
    let start_target = resp.prompt
    clearBoxes()
    renderPrompts(resp.prompts, resp.i, resp.jumpsA, start_target=start_target)
    activateLinks()
    addHelpFocuses(resp.prompt, resp.results)
}

function startHelpSteps(){
    toggleElement('modal');
    beginTutorial()
    // HELP_STEPS.unshift(
    //     {
    //         id: 0,
    //         prompt: ['outside', 'layer'],
    //         result: 'outside',
    //         message: `Here are some words like <span class='link--disabled'>outside</span>.`,
    //         transform: [20,60]
    //     }
    // )
}
function startHelpSession() {
        localStorage.setItem('is_help', 'true');
        start_text = `<p id="modalText"> Welcome to word.golf, a sport played with the meanings of words!</p>
        <button class="switch switch--outlined" onclick="startHelpSteps()"> OK </button>`
        displayModal(start_text)
    }

function clearInfoBox() {
    let info = document.getElementById("info-box")
    info.innerHTML = '';
    info.style.display = "none";
    localStorage.removeItem('previous_words');
}

function renderHelpFinish(){
    clearInfoBox()
    help_finish_text = `<div>
    <p id="modalText">Good luck!</p>
    <div id="dots-container">
      <span class="dot">.</span>
      <span class="dot">.</span>
      <span class="dot">.</span>
    </div>
  </div>`;

    setTimeout(() => {
        displayModal(help_finish_text);
        setTimeout(startGame, START_GAME_DELAY_MS);
    }, HELP_FINISH_DELAY_MS);
}