function clearBoxes() {
    // get all .word-tally-box elements inside .prompt-box
    const wordTallyBoxes = document.querySelectorAll('#prompts .prompt-box .word-tally-box');
    for (let box of wordTallyBoxes) {
        clearChildren(box);
    }
}

function renderWord(word, row, column, {animate=true, style=[]} = {}) {
   
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

// Given a promptBox and prompt-tally-container, removes one tally from the correct cell.
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
    // if (end == false) {
    promptWords.forEach(word => word.remove());
    // } else {
    //     promptWords.forEach(word => word.classList.remove('prompt-word'));
    //     promptWords.forEach(word => updateInnerTextSmooth(word, ''));
    // }
}


function clearBoxes() {
    // get all .word-tally-box elements inside .prompt-box
    const wordTallyBoxes = document.querySelectorAll('#prompts .prompt-box .word-tally-box');
    for (let box of wordTallyBoxes) {
        clearChildren(box);
    }
}

function clearLastTallyContainer(ct) {
    promptBoxes = document.querySelectorAll('#prompts .prompt-box');
    const box = promptBoxes[ct - 1];
    if (box.children[5].classList.contains('word-tally-container')) {
        clearChildren(box.children[5]);
    }
}

function updateInnerTextSmooth(elem, newText, animate) {
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
function renderTallies(jumpsArray) {
    //adding tallyDivs.
    let wordTallyContainers = document.querySelectorAll('#prompts .prompt-box .word-tally-box');
    jumpsArray.forEach((row, row_idx) => {
        row.forEach((tally_count, col_idx) => {
            let wordTallyContainer = wordTallyContainers[row_idx * 6 + col_idx]
            while (wordTallyContainer.querySelectorAll('.tally').length < tally_count){
                // alert('adding tally')
                let tallyDiv = document.createElement("div");
                tallyDiv.className = 'tally';
                wordTallyContainer.appendChild(tallyDiv);
            }
        });
    });
}

function renderWord(word, row, column, {animate=true, style=[]} = {}) {
   
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


// Given a promptBox and prompt-tally-container, removes one tally from the correct cell.
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


function tallyPrompts(prompts, jumpsArray, current_jumps) {
    let targets = prompts.map(arr => arr[1]);
    ct = jumpsArray.length;
    tallyStarts(targets);
    tallyAllPrompts(ct, current_jumps)
}

function addTallyContainers(promptBox){
    if (promptBox.children.length === 0){
        for (let i = 0; i < 6; i++) {
            let div = document.createElement("div");
            div.className = 'word-tally-container'
            promptBox.appendChild(div);
        }
    }
}

function cueStartWordOnHover() {
    const link = document.body.querySelector('.link--starting');
    const prompt = document.body.querySelector('.prompt-start-word');
    if (!link || !prompt) {
        console.warn('Link or prompt element not found for hover cue.');
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


/**
 * @param {Array} jumpsArray
 * @param {[[number, number], [number, number]]} idxs 
 * @param {[string, string]} start_target
 */
function renderPrompts(jumpsArray, idxs, start_target, end = false) {
    // console.log('[renderPrompts] jumpsArray:', jumpsArray);
    clearAllPromptWords();
    renderTallies(jumpsArray);
    if (!end) {
        // console.log("End is false here adding these start targets");
        // console.log(start_target);
        // console.trace('[renderPrompts] Stack trace');
        const [start_idx, target_idx] = idxs;
        const [start, target] = start_target;
        renderWord(start, ...start_idx, {style: ["prompt-start-word"]});
        renderWord(target, ...target_idx, {animate: false});
    }
    cueStartWordOnHover()
}
