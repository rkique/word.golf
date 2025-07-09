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
    if (box.children[5].classList.contains('word-tally-box')) {
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
        console.log('[updateInnerTextSmooth] not animating text change');
        elem.innerText = newText;
    }
}

//add a .prompt-word to a tally contaner.
//the tally containers themselves are always reprsenting the jumpsArray
//the .prompt-word class overrides the tally container class.
//renderTallies(jumpsArray){}
//addStartWord()
//addTargetWord()

//given a promptBox and prompt-tally-container, updates the correct one with tallyDiv.
function renderTallies(jumpsArray) {
    //adding tallyDivs.
    let wordTallyContainers = document.querySelectorAll('#prompts .prompt-box .word-tally-box');
    let tallyCount = 0
    jumpsArray.forEach((row, row_idx) => {
        row.forEach((tally_count, col_idx) => {
            let wordTallyContainer = wordTallyContainers[row_idx * 6 + col_idx]
            while (wordTallyContainer.querySelectorAll('.tally').length < tally_count){
                let tallyDiv = document.createElement("div");
                tallyDiv.className = 'tally';
                wordTallyContainer.appendChild(tallyDiv);
                tallyCount ++;
            }
        });
    });
}

//renders a prompt-word on top of an existing tally class.
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


//Now on clear, we want to save the promptword here.
function clearAllPromptWords(end) {
    const promptWords = document.querySelectorAll('.prompt-word');
    promptWords.forEach(word => {
        const promptBox = word.closest('.prompt-box');
        //this looks at all word-tally-boxes in the promptBox, and gets the 6th box...adds last-target-tally.
        const tallyBoxes = promptBox?.querySelectorAll('.word-tally-box');
        if (tallyBoxes?.[5] && tallyBoxes[5].contains(word)) {
            word.classList.add('last-target-tally');
            setTimeout(()=> word.classList.remove('last-target-tally'), 200);
        }
        updateInnerTextSmooth(word, '');
        word.classList.remove('prompt-word');
        word.style.maxWidth = 'auto';
    });
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

// function clearAllPromptWords(end) {
//     const promptWords = document.querySelectorAll('.prompt-word');
//     promptWords.forEach(word => {
//         const promptBox = word.closest('.prompt-box');
//         const tallyBoxes = promptBox.querySelectorAll('.word-tally-box');
//         //TODO: remove the word in 6th tally container.
//         updateInnerTextSmooth(word, '');
//         word.classList.remove('prompt-word');
//         word.style.maxWidth = 'auto';
//     });
// }

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
    const tryAttachHover = () => {
        const link = document.body.querySelector('.link--starting');
        const prompt = document.body.querySelector('.prompt-start-word');

        if (!link || !prompt) {
            // Retry on next frame
            requestAnimationFrame(tryAttachHover);
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

        link.addEventListener('mouseenter', addHover);
        link.addEventListener('mouseleave', removeHover);
        prompt.addEventListener('mouseenter', addHover);
        prompt.addEventListener('mouseleave', removeHover);
    };

    requestAnimationFrame(tryAttachHover);
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
