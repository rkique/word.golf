HELP_FINISH_DELAY_MS = 200
START_GAME_DELAY_MS = 500
let startDateStr = '2025-05-30'

function displayModal(displayHTML, accent){
    let modalEl;
    if (accent == "exclaim") {
        modalEl = document.getElementById('exclaim-modal');
        modalEl.style.display = 'flex';
    }
    else {
    modalEl = document.getElementById('modal');
    }
    
    modalEl.innerHTML = displayHTML;
    modalEl.style.display = 'flex';
}

function daysSinceStartDate(resp) {
    const currentDateStr = resp.date;
    if (!currentDateStr) return null;
    const startDate = new Date(startDateStr);
    const currentDate = new Date(currentDateStr);
    const diffMs = currentDate - startDate;

    days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) - 1;
    return days
}

/* Sums a 2D count array to produce a message */
function renderGrid(counts) {
    let sums = counts.map(inner => Math.max(0, inner.reduce((a, b) => a + b, 0) - 1));
    const colorEmojis = {
        1: '🟢',
        2: '🟩',
        3: '🟦', 
        4: '🟨',
        5: '🟥', 
        6: '⬜',
        7: '⬛',
    };
    const numRows = 5;
    const numCols = 6;
    let gridMessage = '';
    let tiers = [2, 3, 5, 7, 9, 12];
    for (let row = 0; row < numRows; row++) {
        // Find the lowest tier that count fits in
        let count = sums[row];
        let tierIdx = tiers.findIndex(tier => count <= tier);
        let emojiKey = tierIdx !== -1 ? tierIdx + 1 : 6;
        let emoji = colorEmojis[emojiKey] || colorEmojis[7];
        // Display tierIdx number of emojis instead of count
        let emojiCount = tierIdx !== -1 ? tierIdx + 1 : 6;
        let line = emoji.repeat(emojiCount) + colorEmojis[7].repeat(numCols - emojiCount);
        gridMessage += line + '\n';
    }
    return gridMessage;
}

/* Waits for the banner to disappear before executing a fn. */
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


function renderFinish(resp) {
    const daily_idx = daysSinceStartDate(resp);
    is_logged_in = Boolean(localStorage.getItem('logged_in'))
    localStorage.removeItem('in_progress');
    let jumpsGridMessage = resp.jumpsArray ? renderGrid(resp.jumpsArray) : '';
    requestAnimationFrame(() => {requestAnimationFrame(() => {clearAllPromptWords()})});
    hoverAllTallies(resp.wordsArray);
    runAfterBannerDisappears(() => {displayFinishModal(daily_idx, resp.total_jumps, resp.streak, resp.total_games, resp.wordsArray, jumpsGridMessage, is_logged_in, resp.url);})
}

/* Clears the modal, localStorage, and renders links with XML redirect=true*/
/* Called at the end of tutorial */
function startGame() {
    clearInfoBox()
    document.getElementById("information").innerHTML = ``;
    document.getElementById('modal').style.display = 'none';
    localStorage.setItem('is_help', 'false');
    let toDelete = ['jumps', 'jumpsArray', 'startTargetIdxs', 'prompts', 'results']
    toDelete.forEach(key => localStorage.removeItem(key));
    let resp = sendAndReceiveXML('redirect=true');
    clearBoxes()
    document.getElementById('prompts-title-heading').innerText = 'Rounds'
    document.getElementById('prompts-count').innerText = '1'
    document.getElementById('prompts-count-remainder').innerText = '• 5'
    document.getElementById('prompts-count').style.display = '';
    document.getElementById('prompts-count-remainder').style.display = '';

    if ("logged_in" in resp && resp.logged_in) {
        renderLogin(resp.logged_in);
    } 
    let prompt_idx = resp['i'];
    let jumpsArray = resp.jumpsArray;
    let results = resp.results;
    let prompts = resp.prompts;
    let start_target = prompts[prompt_idx];
    let startTargetIdxs = resp.startTargetIdxs;
    // total_jumps is only passed after game end.
    const is_end = 'total_jumps' in resp ? resp.total_jumps : 0;
    start_target = prompts[prompt_idx];
    start_target[0] = results[10];
    //we want no_clear to be set when the user has finished. 
    hasFinishedPrompt = resp.wordsArray.some(inner => inner.includes(start_target[1]))
    hasSkippedPrompt = resp.wordsArray.some(inner => inner.length > 12)
    noPromptWords = hasFinishedPrompt || hasSkippedPrompt
    // console.log('noPromptWords', noPromptWords, 'hasFinishedPrompt', hasFinishedPrompt, 'hasSkippedPrompt', hasSkippedPrompt);
    no_clear = resp.wordsArray ? noPromptWords : false;
    renderPrompts(jumpsArray, resp.wordsArray, startTargetIdxs, start_target, resp.score, is_end, no_clear)
    renderLinks(start_target, results, prompt_idx, is_end); 
    activateLinks();

}

// function generateLineGraph(scores) {
//     localStorage.setItem('jumpsArray', JSON.stringify(scores));
//     const graphContainer = document.getElementById("scoresGraph");
//     if (!graphContainer) return;
//     const rootStyles = getComputedStyle(document.documentElement);
//     const axisLineColor = rootStyles.getPropertyValue('--border-color') || '#cccccc';

//     const trace = {
//         x: scores.map((_, i) => i + 1),
//         y: scores,
//         type: 'scatter',
//         mode: 'lines+markers',
//         hoverinfo: 'y',
//         hoverlabel: {
//             bgcolor: rootStyles.getPropertyValue('--background-color'),
//             font: {
//                 color: rootStyles.getPropertyValue('--text-color'),
//                 size: 14
//             },
//             bordercolor: rootStyles.getPropertyValue('--grayed-out-color')
//         },
//         line: {
//             color: rootStyles.getPropertyValue('--border-color'),
//             width: 3
//         },
//         marker: {
//             color: rootStyles.getPropertyValue('--hover-color'),
//             size: 10,
//             opacity: 0.6
//         }
//     };

//     const layout = {
//         height: window.innerHeight * 0.4,
//         width: window.innerWidth * 0.4,
//         dragmode: false,
//         xaxis: {
//             visible: true,
//             autorange: true,
//             showline: true,
//             linecolor: axisLineColor,
//             linewidth: 1,
//             mirror: true
//         },
//         yaxis: {
//             visible: true,
//             range: [0,6],
//             showline: true,
//             linecolor: axisLineColor,
//             linewidth: 1,
//             mirror: true
//         },
//         plot_bgcolor: rootStyles.getPropertyValue('--background-color') || '#ffffff',
//         paper_bgcolor: rootStyles.getPropertyValue('--background-color') || '#ffffff',
//     };

//     const config = {
//         displayModeBar: false,
//         displaylogo: false,
//         responsive: true,
//         scrollZoom: false,
//         doubleClick: false,
//         staticPlot: false
//     };

//     Plotly.newPlot(graphContainer, [trace], layout, config);
// }

function formatFinishWords(wordsArray){
    return wordsArray.map(row => row.map(word => `<span class="finish-word">${word}</span>`).join(' ')).join('<br>');
}
function displayFinishModal(daily_idx, totalJumps, currentStreak, total_games, selectedWords, jumpsGridMessage, is_user=false, url) {
    const modalFinish = document.getElementById(is_user ? 'modal-finish-user' : 'modal-finish-guest');
    const date = new Date();
    const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    modalFinish.querySelector('.day-cell').innerHTML = `<p>${daily_idx}</p> <span>${formatted}</span>` 
    modalFinish.querySelector('.totalJumps').innerHTML = totalJumps;
    modalFinish.querySelector('.streak').innerHTML = currentStreak;
    modalFinish.querySelector('.totalGames').innerHTML = total_games;
    // Map selectedWords to an array of words each in a finish-word class
    const selectedWordsEl = modalFinish.querySelector('.selectedWords');
    if (selectedWordsEl && Array.isArray(selectedWords)) {
        selectedWordsEl.innerHTML = formatFinishWords(selectedWords);
    }
    modalFinish.style.display = "flex";
    let tweetMessage;
    if (is_user) {
        tweetMessage = url + ` #${daily_idx} \nJumps: ${totalJumps} \nStreak: ${currentStreak} \n${jumpsGridMessage}`;
    } else {
        tweetMessage = url + ` #${daily_idx} \n\nJumps: ${totalJumps} \n${jumpsGridMessage}`;
    }
    const shareLink = modalFinish.querySelector('#shareLink');
    shareLink.addEventListener('click', () => {
        navigator.clipboard.writeText(tweetMessage)
            .then(() => {
                shareLink.textContent = 'Copied to clipboard!';
                setTimeout(() => shareLink.innerHTML = 
                `
                Share your results <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-copy">
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
                json.forEach(row => {
                    row.forEach((word, idx) => {
                        row[idx] = `<span class="finish-words">${word}</span>`;
                    });
                });
                const modalFinish = document.querySelector('.modal-finish');
                modalFinish.querySelector('.solutionWords').innerHTML =
                    `<p> ${formatFinishWords(json)}</p>`;
            });
    }
}

function startHelpSteps(){
    closeModal('modal');
}

function startHelpSession() {
    localStorage.setItem('is_help', 'true');
    help = document.getElementById('help');
    help.style.display = 'none'
    resp = sendAndReceiveXML(`help=true`)
    renderLinks(resp.prompt, resp.results, resp.i)
    let start_target = resp.prompt
    clearBoxes()
    renderPrompts(resp.jumpsArray, resp.wordsArray, resp.startTargetIdxs, start_target)
    activateLinks()
    addHelpFocuses(resp.prompt, resp.results)
    document.getElementById('prompts-title-heading').innerText = 'Tutorial'
    document.getElementById('prompts-count-remainder').style.display = 'none';
    document.getElementById('prompts-count').style.display = 'none';
    // start_text = `<p id="modalText"> Welcome to word.golf, a sport played with the meanings of words!</p>
    // <button class="switch switch--outlined" id='startHelpButton'> OK </button>
    // <a id="startGameLink">Skip tutorial</a>`
    // removeTintedModal = renderTintedModal(start_text)
    // document.getElementById('startGameLink').onclick = function(e) {
    // startGame(); removeTintedModal();
    // }
    // const btn = document.getElementById('startHelpButton');
    // if (btn) {
    //     btn.onclick = function() {
    //         startHelpSteps();
    //         removeTintedModal();
    //     };
    // } else {alert('not found')}
}

function clearInfoBox() {
    let info = document.getElementById("info-box")
    info.innerHTML = '';
    info.style.display = 'none'; 
}

function renderTintedModal(displayHTML){
    let modalEl = document.getElementById('modal');
    modalEl.innerHTML = displayHTML;
    modalEl.style.display = 'flex';
    modal.style.zIndex = 200;
    let overlay = document.createElement('div');
    overlay.classList.add('tint-background')
    document.body.appendChild(overlay);
    // debugger;
    return () => {
        overlay.parentNode.removeChild(overlay);
        document.body.style.pointerEvents = 'auto';
    }
}

function renderTransientModal(duration){
    let modal = document.getElementById('modal');
    modal.style.zIndex = 200;
    document.body.style.pointerEvents = 'none';
    let overlay = document.createElement('div');
    overlay.classList.add('tint-background')
    document.body.appendChild(overlay);
    setTimeout(() => {
        modal.style.display = 'none';
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
    removeTintedModal = renderTintedModal(help_finish_text);
    setTimeout(() => {
        localStorage.removeItem('in_progress')
        removeTintedModal()
        startGame()
    }, HELP_FINISH_DELAY_MS + START_GAME_DELAY_MS);
}