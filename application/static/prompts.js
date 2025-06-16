function makePromptTag(start_target, jumps) {
    let div = document.createElement("div");
    div.className = "prompt";

    let pWord = document.createElement("p");
    pWord.className = "prompt-word";
    pWord.style.display = "inline-block";
    pWord.innerText = start_target[0] + ", " + start_target[1];
    div.appendChild(pWord);

    let pJumps = document.createElement("p");
    pJumps.className = "prompt-jumps";
    pJumps.style.display = "inline-block";
    if (window.innerWidth >= 992) {
        pJumps.classList.add("prompt-num-large");
    }
    pJumps.innerText = jumps !== null ? jumps : "";
    div.appendChild(pJumps);

    return div;
}

function makeDonePromptTag(start_target, jumps) {
    let pTag = makePromptTag(start_target,jumps)
    pTag.className = "prompt prompt--done"
    return pTag
}

function renderPrompts(promptTexts, i, jumpsA, current_jumps) {
<<<<<<< Updated upstream:application/static/prompts.js
    console.log(`renderPrompts: ${promptTexts}, i: ${i}, jumpsA: ${jumpsA}`);

=======
>>>>>>> Stashed changes:application/static/js/prompts.js
    // get all prompt-box elements
    const promptBoxes = document.querySelectorAll('#prompts .prompt-box');
    // update "done" prompts
    const done = promptTexts.slice(0, i);
    done.forEach((promptText, idx) => {
        if (promptBoxes[idx]) {
            console.log(`Updating done prompt at index ${idx}: ${promptText}`);
            promptBoxes[idx].style.border = '1px solid var(--greyed-out-color)';
            const doneTag = makeDonePromptTag(promptText, jumpsA[idx]);
            promptBoxes[idx].innerHTML = '';
            promptBoxes[idx].appendChild(doneTag);
        }
    });
    // update current prompt
    if (i < promptTexts.length && promptBoxes[i]) {
        console.log(`Current prompt: ${promptTexts[i]}, jumps: ${current_jumps}`);
        const current = promptTexts[i];
        current_jumps = current_jumps || 0;
        promptBoxes[i].style.border = '2px solid var(--text-color)';
        const currentTag = makePromptTag(current, current_jumps);
        promptBoxes[i].innerHTML = '';
        promptBoxes[i].appendChild(currentTag);
        // animate the jumps span
        const span = currentTag.querySelector('.prompt-jumps');
        if (span && span.innerText !== '0') {
            requestAnimationFrame(() => {
                span.classList.add('animate-scale');
                span.addEventListener('animationend', () => {
                    span.classList.remove('animate-scale');
                }, { once: true });
            });
        }
    }
    // clear remaining boxes
    for (let j = i + 1; j < promptBoxes.length; j++) {
        promptBoxes[j].className = 'prompt-box';
        promptBoxes[j].innerHTML = '';
    }
}

//     if (i < 5){
//         if (i == 0) {
//             current_jumps = current_jumps || 0
//             current = promptTexts[0]
//             todo = promptTexts.slice(1)
//         }
//         else {
//             current = promptTexts[i]
//             todo = promptTexts.slice(i + 1)
//         }
//         promptTag = makePromptTag(current, current_jumps)
//         prompts.append(promptTag);
//         // todo.map(promptText => prompts.append(makePromptTag(promptText)))
//         let span = promptTag.querySelector(".prompt-jumps");
//         if (span && span.innerText != '0') {
//                 requestAnimationFrame(() => {
//                 span.classList.add("animate-scale");
//                 span.addEventListener("animationend", () => {
//                     span.classList.remove("animate-scale");
//                 });
//             });
//         }
//     }
// }
