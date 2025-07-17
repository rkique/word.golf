function clearBoxes() {
    // get all .word-tally-box elements inside .prompt-box
    const wordTallyBoxes = document.querySelectorAll('#prompts .prompt-box .word-tally-box');
    for (let box of wordTallyBoxes) {
        clearChildren(box);
    }
}

function renderWord(word, row, column, { animate = true, style = [] } = {}) {
    let wordTallyContainers = document.querySelectorAll('#prompts .prompt-box .word-tally-box');
    const wordTallyContainer = wordTallyContainers[row * 6 + column]
    // Get the last .tally child of wordTallyContainer and modify it
    let tallies = wordTallyContainer.querySelectorAll('.tally');
    if (tallies.length > 0) {
        promptWord = tallies[tallies.length - 1];
        promptWord.classList.add('prompt-word');
        if (style.length > 0) {
            style.forEach(cls => promptWord.classList.add(cls));
        }
        // promptWord.innerText = word;
        console.log('calling updateInnerTextSmooth');
        updateInnerTextSmooth(promptWord, word, animate)
        wordTallyContainer.appendChild(promptWord);
    } else {
        console.warn(`[renderWord] no tallies at ${row} ${column}`)
    }
}

// Given a promptBox and prompt-tally-container, removes tallies from the correct cell.
// function removeTallyDiv(row, column) {
//     let wordTallyContainers = document.querySelectorAll('#prompts .prompt-box .word-tally-box');
//     let wordTallyContainer = wordTallyContainers[row * 6 + column]
//     const tallies = wordTallyContainer.querySelectorAll('.tally');
//     if (tallies.length > 0){
//         tallies.forEach(tally => {
//             tally.remove();
//         });
//         return [row, column];
//     }
// }

function clearAllPromptWords(end) {
    const promptWords = document.querySelectorAll('.prompt-word');
    if (end == false) {
    promptWords.forEach(word => word.remove());
    } else {
        promptWords.forEach(word => word.classList.remove('prompt-word'));
        promptWords.forEach(word => updateInnerTextSmooth(word, ''));
    }
}


function clearBoxes() {
    // get all .word-tally-box elements inside .prompt-box
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

function updateInnerTextSmooth(elem, newText, animate, isLastUpdate=false) {
    if (animate) {
        const container = elem.closest('.word-tally-box');
        if (!container) return;
        elem.style.maxWidth = 'none';
        const currentWidth = elem.scrollWidth;
        elem.style.maxWidth = currentWidth + 'px';
        requestAnimationFrame(() => {
            elem.innerText = newText;
            requestAnimationFrame(() => {
                const newWidth = elem.scrollWidth;
                // Apply new max-width with transition
                elem.style.maxWidth = newWidth + 'px';
            });
        });
    } else {
        elem.innerText = newText;
    }
}

//given a promptBox and prompt-tally-container, updates the correct one with tallyDiv.
function renderTallies(jumpsArray, wordsArray, i, reverse= false) {
    //adding tallyDivs.
    let wordTallyContainers = document.querySelectorAll('#prompts .prompt-box .word-tally-box');
    if(reverse){
        if (i >= 0) {
            jumpsArray = [
                ...jumpsArray.slice(0, i + 1).reverse(),
                ...jumpsArray.slice(i + 1)
            ];
        }
    }
    jumpsArray.forEach((row, row_idx) => {
        row.forEach((tally_count, col_idx) => {
            let wordTallyContainer = wordTallyContainers[row_idx * 6 + col_idx]
            // while (wordTallyContainer.querySelectorAll('.tally').length > tally_count){
            //     let lastTally = wordTallyContainer.querySelector('.tally:last-child');
            //     if (lastTally) {
            //         lastTally.remove();
            //     }
            // }
            while (wordTallyContainer.querySelectorAll('.tally').length < tally_count) {
                let tallyDiv = document.createElement("div");
                tallyDiv.className = 'tally';
                wordTallyContainer.appendChild(tallyDiv);
            }
        });
    });
}

// Renders tallies at the first position equal to the total number of tallies 
function renderTalliesLinear(jumpsArray) {
    let wordTallyContainers = document.querySelectorAll('#prompts .prompt-box .word-tally-box');
    
    jumpsArray.forEach((row, row_idx) => {
        rowSum = row.reduce((sum, val) => sum + val, 0)
        let wordTallyContainer = wordTallyContainers[row_idx * 6]
        let lastWordTallyContainer = wordTallyContainers[row_idx * 6 + 5]
        while (wordTallyContainer.querySelectorAll('.tally').length < rowSum) {
            let tallyDiv = document.createElement("div");
            tallyDiv.className = 'tally';
            wordTallyContainer.appendChild(tallyDiv);
            // if (lastWordTallyContainer.querySelectorAll('.tally').length < 1){
            //     let tallyDiv = document.createElement("div");
            //     tallyDiv.className = 'tally';
            //     lastWordTallyContainer.appendChild(tallyDiv);
            // }
        }
    });
}

function renderWord(word, row, column, { animate = true, style = [] } = {}) {
    let wordTallyContainers = document.querySelectorAll('#prompts .prompt-box .word-tally-box');
    const wordTallyContainer = wordTallyContainers[row * 6 + column]
    // Get the last .tally child of wordTallyContainer and modify it
    let tallies = wordTallyContainer.querySelectorAll('.tally');
    if (tallies.length > 0) {
        promptWord = tallies[tallies.length - 1];
        promptWord.classList.add('prompt-word');
        if (style.length > 0) {
            style.forEach(cls => promptWord.classList.add(cls));
        }
        // promptWord.innerText = word;
        updateInnerTextSmooth(promptWord, word, animate)
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
        console.warn('Link or prompt element not found for hover cue,', linkClass, promptClass);
        return;
    }
    const addHover = () => {
        link.classList.add('hover-start');
        prompt.classList.add('hover-start');
    };

    const removeHover = () => {
        link.classList.remove('hover-start');
        prompt.classList.remove('hover-start');
    };

    // Add event listeners to both elements
    link.addEventListener('mouseenter', addHover);
    link.addEventListener('mouseleave', removeHover);
    prompt.addEventListener('mouseenter', addHover);
    prompt.addEventListener('mouseleave', removeHover);
}

function renderScore(score){
    score = Math.min(score / 0.005, 100);
    const promptsBar = document.getElementById('prompts-bar')
    promptsBar.style.width = `${score}%`;
}
/**
 * @param {Array} jumpsArray
 * @param {[[number, number], [number, number]]} idxs 
 * @param {[string, string]} start_target
 */
function renderPrompts(jumpsArray, idxs, start_target, score, end = false) {
    if (score ==  undefined) {
        score = 0;
    }
    renderScore(score)
    reverseDisplay = false
    clearAllPromptWords(end);
    let i = lastNonzeroRow(jumpsArray);
    if (i == -1) {
        i = 5
    } else {
        i = i + 1
    }
    document.getElementById('prompts-count').innerText = i;
    i = i - 1; // 0-index
    renderTalliesLinear(jumpsArray, i, reverse=reverseDisplay)
    if (!end) {
        const [start_idx, target_idx] = idxs;
        const [start, target] = start_target;
        if (reverseDisplay) {
            start_idx[0] = i - start_idx[0]
            target_idx[0] = i - target_idx[0]
        }
        //adjust to be linear.
        start_idx[1] = 0
        renderWord(start, ...start_idx, { style: ["prompt-start-word"] });
        renderWord(target, ...target_idx, { animate: false , style: ["prompt-target-word"]});
        
    }
    cueLinkPromptOnHover('.link--starting', '.prompt-start-word');
    cueLinkPromptOnHover('.link--target', '.prompt-target-word');
}