HELP_FINISH_DELAY_MS = 500
START_GAME_DELAY_MS = 1500

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
    const colorEmojis = {
        1: '🟩', // green
        2: '🟩', // blue
        3: '🟦', // yellow
        4: '🟨', // red
        5: '🟥', // white
        6: '⬜', // white
        7: '⬛',
    };
    const numRows = 5;
    const numCols = 6;
    let gridMessage = '';
    for (let row = 0; row < numRows; row++) {
        let count = Math.ceil(counts[row] / 2);
        let emoji = colorEmojis[count] || colorEmojis[7];
        let line = emoji.repeat(count) + colorEmojis[7].repeat(numCols - count);
        gridMessage += line + '\n';
    }
    return gridMessage;
}

function runAfterBannerDisappears(callback) {
  const banner = document.querySelector('.promptEndBanner');
  if (!banner) {
    callback();
    return;
  }
  const observer = new MutationObserver(() => {
    if (!document.body.contains(banner)) {
      observer.disconnect();
      callback();
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

//we're guaranteed resp.newStreak because renderFinish only called with session_done.
function renderFinish(resp) {
    totalJumps = resp.jumpsArray.reduce((acc, val) => acc + val, 0);
    console.log("[render_finish] session_done data: ", data)
    const daily_idx = daysSinceStartDate();
    is_logged_in = Boolean(localStorage.getItem('logged_in'))
    let jumpsGridMessage = resp.jumpsA ? renderGrid(resp.jumpsA) : '';
    runAfterBannerDisappears(() => {displayFinishModal(daily_idx, totalJumps, resp.streak, jumpsGridMessage, is_logged_in)})
}

/* Clears the modal, localStorage, and renders links with XML redirect=true*/
function startGame() {
    clearInfoBox()
    document.getElementById("information").innerHTML =
            ``;
    document.getElementById('modal').style.display = 'none';
    localStorage.setItem('is_help', 'false');
    localStorage.removeItem('jumps');
    localStorage.removeItem('jumpsArray');
    localStorage.removeItem('prompts');
    localStorage.removeItem('results');
    resp = sendAndReceiveXML('redirect=true');
    clearBoxes()
    const data = resp;
    console.log("[start Game] backend response: ", resp);
    if ("logged_in" in data) {
        if (data.logged_in) {
            renderLogin(data.logged_in)
        }
    }
    let loaded = data;
    let prompt_idx = data['i'];
    let jumpsArray = loaded.jumpsArray;
    let jumps = loaded.jumps;
    let results = loaded.results || data['results'];
    let prompts = loaded.prompts;
    let start_target = prompts[prompt_idx];
    // total_jumps is only passed after game end.
    const is_end = 'total_jumps' in loaded ? loaded.total_jumps : 0;
    start_target = prompts[prompt_idx];
    if(!setPrompts()){renderPrompts(prompts, jumpsArray, jumps, start_target=start_target)}
    renderLinks(start_target, results, prompt_idx, is_end); 
    activateLinks();
}

function generateLineGraph(scores) {
    localStorage.setItem('jumpsArray', JSON.stringify(scores));
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
    let tweetMessage;
    if(is_user){
        tweetMessage = `https://word.golf #${daily_idx} \nJumps: ${totalJumps} \nStreak: ${currentStreak} \n${jumpsGridMessage}`;
    } else {
        tweetMessage = `https://word.golf #${daily_idx} \n\nJumps: ${totalJumps} \n${jumpsGridMessage}`;
    }
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



function startHelpSteps(){
    toggleElement('modal');
}

function startHelpSession() {
    localStorage.setItem('is_help', 'true');
    help = document.getElementById('help');
    help.style.display = 'none'
    data = sendAndReceiveXML(`help=true`)
    renderLinks(data.prompt, data.results, data.i)
    let start_target = data.prompt
    clearBoxes()
    renderPrompts(data.prompts, data.jumpsArray, 0, start_target=start_target)
    activateLinks()
    addHelpFocuses(data.prompt, data.results)
    start_text = `<p id="modalText"> Welcome to word.golf, a sport played with the meanings of words!</p>
    <button class="switch switch--outlined" onclick="startHelpSteps()"> OK </button>`
    displayModal(start_text)
}

function clearInfoBox() {
    let info = document.getElementById("info-box")
    info.innerHTML = '';
    info.style.display = 'none'; //hide container.
}

function renderTransientModal(duration){
    let modal = document.getElementById('modal');
    modal.style.zIndex = 200;
    document.body.style.pointerEvents = 'none';
    let overlay = document.createElement('div');
    overlay.classList.add('tint-background')
    document.body.appendChild(overlay);
    setTimeout(() => {
        overlay.parentNode.removeChild(overlay);
        document.body.style.pointerEvents = 'auto';
    }, duration);
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
        renderTransientModal(START_GAME_DELAY_MS + HELP_FINISH_DELAY_MS)
        setTimeout(startGame, START_GAME_DELAY_MS);
    }, HELP_FINISH_DELAY_MS);
}