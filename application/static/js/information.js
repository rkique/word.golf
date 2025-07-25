HELP_FINISH_DELAY_MS = 300
START_GAME_DELAY_MS = 800

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

function daysSinceStartDate(startDateStr = '2025-05-31', storageKey = 'current_date') {
    const currentDateStr = localStorage.getItem(storageKey);
    if (!currentDateStr) return null;

    const startDate = new Date(startDateStr);
    const currentDate = new Date(currentDateStr);
    const diffMs = currentDate - startDate;

    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
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
    const daily_idx = daysSinceStartDate();
    is_logged_in = Boolean(localStorage.getItem('logged_in'))
    localStorage.removeItem('in_progress');
    let jumpsGridMessage = resp.jumpsArray ? renderGrid(resp.jumpsArray) : '';
    scores = resp.jumpsArray ? resp.jumpsArray.map(inner => inner.reduce((a, b) => a + b, 0)) : [];
    lowestScoreIndex = scores.indexOf(Math.min(...scores));
    requestAnimationFrame(() => {requestAnimationFrame(() => {clearAllPromptWords()})});
    hoverAllTallies(resp.wordsArray);
    runAfterBannerDisappears(() => {displayFinishModal(daily_idx, resp.total_jumps, resp.streak, resp.total_games, resp.wordsArray, jumpsGridMessage, is_logged_in, resp.other_words_arrays, lowestScoreIndex);})
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
    document.getElementById('prompts-title-heading').innerText = 'Prompts'
    document.getElementById('prompts-count-remainder').innerText = '/ 5'

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
    console.log('noPromptWords', noPromptWords, 'hasFinishedPrompt', hasFinishedPrompt, 'hasSkippedPrompt', hasSkippedPrompt);
    no_clear = resp.wordsArray ? noPromptWords : false;
    renderPrompts(jumpsArray, resp.wordsArray, startTargetIdxs, start_target, resp.score, is_end, no_clear)
    renderLinks(start_target, results, prompt_idx, is_end); 
    activateLinks();
}

function downloadSvg(svgId) {
    // Use SVG Crowbar approach for robust SVG download
    const svg = document.getElementById(svgId);
    if (!svg) return;

    // Create a clone to avoid modifying the original
    const clone = svg.cloneNode(true);
    
    // Add custom font definitions to the SVG
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.setAttribute('type', 'text/css');
    style.textContent = `
        @font-face {
            font-family: 'Schibsted Grotesk';
            src: url('static/Schibsted_Grotesk/SchibstedGrotesk-VariableFont_wght.ttf') format('truetype');
            font-weight: 100 900;
            font-style: normal;
        }
        @font-face {
            font-family: 'Schibsted Grotesk';
            src: url('static/Schibsted_Grotesk/SchibstedGrotesk-Italic-VariableFont_wght.ttf') format('truetype');
            font-weight: 100 900;
            font-style: italic;
        }
        text {
            font-family: 'Schibsted Grotesk', Arial, sans-serif;
        }
    `;
    defs.appendChild(style);
    clone.insertBefore(defs, clone.firstChild);
    
    const allElements = clone.querySelectorAll('*');
    allElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        let styleStr = Array.from(computedStyle).map(prop => 
            `${prop}:${computedStyle.getPropertyValue(prop)}`
        ).join(';');
        
        // Ensure font-family is set to Schibsted Grotesk for text elements
        if (element.tagName === 'text') {
            styleStr = styleStr.replace(/font-family:[^;]+/, "font-family:'Schibsted Grotesk', Arial, sans-serif");
        }
        
        element.setAttribute('style', styleStr);
    });

    // Add namespace and other required attributes
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    
    // Get SVG dimensions
    const svgRect = svg.getBoundingClientRect();
    const width = svgRect.width || 800;
    const height = svgRect.height || 600;
    
    // Create canvas for PNG conversion
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size with higher resolution for better quality
    const scale = 2;
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.scale(scale, scale);
    
    // Set white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    // Serialize SVG
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    
    // Create image from SVG
    const img = new Image();
    img.onload = function() {
        // Draw image to canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert canvas to PNG and download
        canvas.toBlob(function(blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'word-path-network.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 'image/png');
    };
    
    // Convert SVG to data URL and load into image
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    img.src = svgUrl;
}

function formatFinishWords(wordsArray){
    return wordsArray.map(row => row.map(word => `<span class="finish-word">${word}</span>`).join(' ')).join('<br>');
}
function displayFinishModal(daily_idx, totalJumps, currentStreak, total_games, selectedWords, jumpsGridMessage, is_user=false, otherWordsArrays=null, lowestScoreIndex) {
    const modalFinish = document.getElementById(is_user ? 'modal-finish-user' : 'modal-finish-guest');
    modalFinish.querySelector('.daily-idx').innerHTML = daily_idx;
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
                json.forEach(row => {
                    if (row.length > 0) row[0] = `<span class="finish-word-start">${row[0]}</span>`;
                    if (row.length > 1) row[row.length - 1] = `<span class="finish-word-end">${row[row.length - 1]}</span>`; 
                });
                const modalFinish = document.querySelector('.modal-finish');
                modalFinish.querySelector('.solutionWords').innerHTML =
                    `<p> ${formatFinishWords(json)}</p>`;
            });
    }

    // Create word path diagram for lowest score if data is available
    if (otherWordsArrays && typeof window.createWordPathDiagram === 'function') {
        setTimeout(() => {
            window.createWordPathDiagram(otherWordsArrays, selectedWords, lowestScoreIndex);
        }, 50);
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
    document.getElementById('prompts-count-remainder').innerText = '/2'
    start_text = `<p id="modalText"> Welcome to word.golf, a sport played with the meanings of words!</p>
    <button class="switch switch--outlined" id='startHelpButton'> OK </button>
    <a id="startGameLink">Skip tutorial</a>`
    removeTintedModal = renderTintedModal(start_text)
    document.getElementById('startGameLink').onclick = function(e) {
    startGame(); removeTintedModal();
    }
    const btn = document.getElementById('startHelpButton');
    if (btn) {
        btn.onclick = function() {
            startHelpSteps();
            removeTintedModal();
        };
    } else {alert('not found')}
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