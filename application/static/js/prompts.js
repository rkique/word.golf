//this is some unnecessary overhead to be called every time.
function clearAllPromptWords() {
    const promptWords = Array.from(document.querySelectorAll('.prompt-start-word'))
                        .filter(el => el.dataset.finished !== "true");
    // debugger;
    promptWords.forEach(word => word.classList.remove('prompt-word'));
    promptWords.forEach(word => word.classList.remove('prompt-start-word'));
    promptWords.forEach(word => updateInnerTextSmooth(word, '', true));
}

function clearBoxes() {
    const wordTallyBoxes = document.querySelectorAll('#prompts .prompt-box .word-tally-box');
    for (let box of wordTallyBoxes) {
        clearChildren(box);
    }
}

function clearLastPromptBox() {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            let promptBoxes = document.querySelectorAll('#prompts .prompt-box');
            lastPromptBox = promptBoxes[4];
            if (lastPromptBox) {
                Array.from(lastPromptBox.children).forEach(child => {
                    Array.from(child.children).forEach(grandchild => {
                        if (grandchild.innerText !== '') {
                            grandchild.innerText = '';
                            grandchild.classList.remove('prompt-word');
                            grandchild.classList.remove('prompt-start-word')
                        }
                    });
                });
            }
        });
    });
}

//Updates the innerText smoothly
function updateInnerTextSmooth(elem, newText, animate) {
    elem.style.setProperty('will-change', 'max-width, padding');
    if (!elem) return;
    if (elem.classList.contains('prompt-word')) { return;}
    if (!animate) {elem.innerText = newText; return;}
    const oldText = elem.innerText;
    const currentWidth = elem.offsetWidth;
    const currentColor = elem.style.color;
    elem.style.transition = 'none';
    elem.style.maxWidth = `${currentWidth}px`;
    elem.offsetHeight; // force reflow
    if (newText === '') {
        //TODO: set to defaults.
        elem.style.transition = 'max-width 0.5s ease, padding 0.5s ease';
        elem.style.setProperty('padding', '0rem');
        requestAnimationFrame(() => {
            elem.style.maxWidth = '0px';
            elem.style.setProperty('color', 'var(--4)');

        });
        setTimeout(() => {
            elem.innerText = '';
            elem.style.setProperty('padding', '0rem');
            elem.style.maxWidth = 'none'; // reset after
            elem.style.setProperty('will-change', 'auto');
        }, 200);
    } else {
        //we start with no maxWidth, but measure the display.
        elem.style.maxWidth = 'none';
        elem.style.padding = '0 1rem';
        elem.innerText = newText;
        const newWidth = elem.scrollWidth;

        // (FL) Reset to old text and lock current width
        elem.innerText = oldText;
        elem.style.maxWidth = `0px`;
        elem.offsetHeight;

        // (IP) Animate to new width and update text
        elem.style.transition = 'max-width 0.5s ease';
        requestAnimationFrame(() => {
            elem.innerText = newText;
            elem.style.maxWidth = `${newWidth + 100}px`;
        });
        setTimeout(() => {
            elem.style.setProperty('color', 'var(--4)')
             elem.style.setProperty('will-change', 'auto');
        }, 200);
    }
}

function hoverTallyRow(wordsArray, i) {
    const wordTallies = document.querySelectorAll('#prompts .prompt-box .tally');
    const promptBoxes = document.querySelectorAll('#prompts .prompt-box');
    const talliesByPromptBox = Array.from(promptBoxes).map(box =>
        Array.from(box.querySelectorAll('.tally'))
    );
    rowArr = wordsArray[i]
    rowArr.forEach((_, col) => {
        const idx = talliesByPromptBox.slice(0, i).reduce((sum, arr) => sum + arr.length, 0) + col;
        const container = wordTallies[idx];
        if (container) {
            if (container.classList.contains('prompt-word')) {
                return;
            }
            updateInnerTextSmooth(container, rowArr[col], true);
        }
    });
}

function disablePrompts(){
    const tallies = document.querySelectorAll('#prompts .prompt-box .tally');
    tallies.forEach(tally => {
        tally.dataset.finished = 'true';
        tally.style.setProperty('border-color', 'var(--4)', 'important');
        tally.style.setProperty('color', 'var(--4)', 'important');
    });
}

//This specifically disables the prompts at the end of the game and should not be used elsewhere.
function hoverAllTallies(wordsArray) {
    const promptBoxes = document.querySelectorAll('#prompts .prompt-box');
    requestAnimationFrame(() => {
    //todo: find a different workaround
    appendTally(promptBoxes[4].children[0])
    promptBoxes[4].children[5].children[0].classList.remove('prompt-target-word');
    promptBoxes[4].children[5].children[0].classList.remove('prompt-word');
    wordsArray.forEach((rowArr, row) => {
        let wordTallyContainer = promptBoxes[row].children[0]
        rowArr.forEach((word, col) => {
            let wordTallyContainerTally = wordTallyContainer.children[col]
            if (wordTallyContainerTally){
            updateInnerTextSmooth(wordTallyContainerTally, word, true);
            }
        })
    })
    });
}

function appendTally(container){
    let tallyDiv = document.createElement("div");
    tallyDiv.className = 'tally';
    container.appendChild(tallyDiv);
}
// Renders tallies at the first position equal to the total number of tallies 
function renderTalliesLinear(jumpsArray, wordsArray, end=false) {
    if (!wordsArray) {
        wordsArray = []
    }
    let lastRow = lastNonzeroRow(jumpsArray)
    const promptBoxes = document.querySelectorAll('#prompts .prompt-box');
    jumpsArray.forEach((row, row_idx) => {
        rowSum = row.reduce((sum, val) => sum + val, 0) - 1
        //for all prior rows, we want to use rowSum + 1.
        let shouldSetLastTally = false; 
        if (end === true && row_idx === lastRow - 1){
            shouldSetLastTally = true;
        }
        let targetPromptText = '';
        if (row_idx < lastRow) {
            rowSum += 1
            targetPromptWord = promptBoxes[row_idx].children[5].children[0]
            //this is reset for last words.
            if (targetPromptWord){
            targetPromptText = targetPromptWord.innerText
            targetPromptWord.innerText = '';
            targetPromptWord.classList.remove('prompt-target-word')
            targetPromptWord.classList.remove('prompt-word')
            }
        }
        let wordTallyContainer = promptBoxes[row_idx].children[0]
        let lastWordTallyContainer = promptBoxes[row_idx].children[5]
        while (wordTallyContainer.querySelectorAll('.tally').length < rowSum) {
            appendTally(wordTallyContainer); 
            if (lastWordTallyContainer.querySelectorAll('.tally').length < 1) {
                appendTally(lastWordTallyContainer);
            }
        }
        if (shouldSetLastTally && localStorage.getItem('in_progress')){
                numTallies = Array.from(promptBoxes[row_idx].children[0].children).length
                console.log(`setting last tally to ${targetPromptText}`)
                lastTally = promptBoxes[row_idx].children[0].children[numTallies-1]
                lastTally.innerText = targetPromptText
                updateInnerTextSmooth(lastTally, '', true)
        }
    });
    //add hover collapse and entry
    wordsArray.forEach((rowArr, row) => {
        promptBoxTC = promptBoxes[row].children[0]
        rowArr.forEach((_, col) => {
            let container = promptBoxTC.children[col]
            if (container) {
                if (container.classList.contains('prompt-word')) {
                    return;
                }
                if (container && localStorage.getItem('in_progress')) {
                    let hoverTimeout;
                    container.addEventListener('mouseenter', () => {
                        hoverTimeout = setTimeout(() => {
                        updateInnerTextSmooth(container, rowArr[col], true);
                    }, 100)
                    });
                    container.addEventListener('mouseleave', () => {
                        clearTimeout(hoverTimeout);
                        updateInnerTextSmooth(container, '', true)
                    });
                }
                if (container.dataset.finished === "true") {
                    const newContainer = container.cloneNode(true);
                    container.parentNode.replaceChild(newContainer, container);
                    return;
                }
            }
        });
    });
}

function renderWord(word, row, column, { animate = true, style = [] } = {}) {
    let promptBoxes = document.querySelectorAll('#prompts .prompt-box')
    promptBox = promptBoxes[row]
    const wordTallyContainer = promptBox.children[column]
    let tallies = wordTallyContainer.querySelectorAll('.tally');
    if (tallies.length > 0) {
        promptWord = tallies[tallies.length - 1];
        if (style.length > 0) {
            style.forEach(cls => promptWord.classList.add(cls));
        }
        // promptWord.innerText = word;
        updateInnerTextSmooth(promptWord, word, animate)
        promptWord.classList.add('prompt-word');
        wordTallyContainer.appendChild(promptWord);
    } else {
        console.warn(`[renderWord] no tallies at ${row} ${column}`)
    }
}


function addTallyContainers(promptBox) {
    if (promptBox.children.length === 0) {
        for (let i = 0; i < 6; i++) {
            let div = document.createElement("div");
            div.className = 'word-tally-container'
            promptBox.appendChild(div);
        }
    }
}

function cueLinkPromptOnHover(linkClass, promptClass) {
    const link = document.body.querySelector(linkClass);
    const prompt = document.body.querySelector(promptClass);
    if (!link || !prompt) {
        // console.warn('Link or prompt element not found for hover cue,', linkClass, promptClass);
        return;
    }
    // const addHover = () => {
    //     link.classList.add('hover-start');
    //     prompt.classList.add('hover-start');
    // };

    // const removeHover = () => {
    //     link.classList.remove('hover-start');
    //     prompt.classList.remove('hover-start');
    // };

    // // Add event listeners to both elements
    // link.addEventListener('mouseenter', addHover);
    // link.addEventListener('mouseleave', removeHover);
    // prompt.addEventListener('mouseenter', addHover);
    // prompt.addEventListener('mouseleave', removeHover);
}

function renderScore(score) {
    // if(!localStorage.getItem('in_progress')){
    //     return 
    // }
    score = Math.min(score / 0.007, 100);
    const promptsBar = document.getElementById('prompts-bar')
    promptsBar.style.width = `${score}%`;
}
/**
 * @param {Array} jumpsArray
 * @param {[[number, number], [number, number]]} idxs 
 * @param {[string, string]} start_target
 */
function renderPrompts(jumpsArray, wordsArray, idxs, start_target, score, end = false) {
    reverseDisplay = false
    if (score == undefined) {
        score = 0;
    }
    // debugger;
    renderScore(score)
    clearAllPromptWords();
    let i = lastNonzeroRow(jumpsArray);
    if (i == -1) { i = 5}
    else { i = i + 1}
    document.getElementById('prompts-count').innerText = i;
    i = i - 1; // 0-index
    // debugger;
    renderTalliesLinear(jumpsArray, wordsArray, end=end)
    const [start_idx, target_idx] = idxs;
    const [start, target] = start_target;
    if (reverseDisplay) {
        start_idx[0] = i - start_idx[0]
        target_idx[0] = i - target_idx[0]
    }
    //adjust to be linear.
    start_idx[1] = 0
    if(!(localStorage.getItem('lastComplete') === localStorage.getItem('current_date'))){
    renderWord(start, ...start_idx, { style: ["prompt-start-word"] });
    renderWord(target, ...target_idx, { animate: false, style: ["prompt-target-word"] });
    }
    cueLinkPromptOnHover('.link--starting', '.prompt-start-word');
    cueLinkPromptOnHover('.link--target', '.prompt-target-word');
}