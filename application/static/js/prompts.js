//[start, target], jumps, cos
function makeSpacedPromptTag(start_target, score){
    let div = document.createElement("div");
    div.style.display = "flex";
    div.style.flexDirection = "row";
    div.style.width = "100%";
    for (let i = 0; i < 6; i++) {
        let cell = document.createElement("div");
        cell.style.flex = "1";
        cell.style.textAlign = "center";
        cell.style.display = "flex";
        cell.style.alignItems = "center";
        cell.style.justifyContent = "center";
        cell.style.minHeight = "2em";
        if (i === 5) {
            cell.innerText = start_target[1];
            cell.className = "prompt-word";
        }
        div.appendChild(cell);
    }
    let idx = score < 0.2 ? 0 :
              score < 0.3 ? 1 :
              score < 0.4 ? 2 :
              score < 0.5 ? 3 : 4;
    div.children[idx].innerText = start_target[0];
    div.children[idx].className = "prompt-word";
    return div;
}

function makePromptTag(start_target, jumps) {
    let div = document.createElement("div");
    div.className = "prompt";

    let pWord = document.createElement("p");
    pWord.className = "prompt-word";
    pWord.style.display = "inline-block";
    pWord.innerText = start_target[1];
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
    // Use makeSpacedPromptTag with start at idx 0 and finish at idx 5
    let spacedTag = makeSpacedPromptTag(start_target, 0); // score=0 puts start at idx 0
    spacedTag.className += " prompt--done";
    return spacedTag;
}

function renderPrompts(promptTexts, i, jumpsA, current_jumps, start_target=null, score=null) {

    // console.log(`renderPrompts: ${promptTexts}, i: ${i}, jumpsA: ${jumpsA}`);
    // get all prompt-box elements
    const promptBoxes = document.querySelectorAll('#prompts .prompt-box');
    // update "done" prompts
    const done = promptTexts.slice(0, i);
    done.forEach((promptText, idx) => {
            promptBoxes[idx].style.border = '1px solid var(--grayed-out-color)';
            const doneTag = makeDonePromptTag(promptText, jumpsA[idx]);
            promptBoxes[idx].innerHTML = '';
            promptBoxes[idx].appendChild(doneTag);
    });

    // update current prompt
    if (i < promptTexts.length && promptBoxes[i]) {
        let current = promptTexts[i];
        let current_score = 0
        if(start_target && score != 0){
            current = start_target
            current_score = score
        }
        let currentTag = makeSpacedPromptTag(current, current_score);
        // current_jumps = current_jumps || 0;
        // promptBoxes[i].style.border = '2px solid var(--text-color)';
        // const currentTag = makePromptTag(current, current_jumps);
        promptBoxes[i].innerHTML = '';
        promptBoxes[i].appendChild(currentTag);
    }

    // clear remaining boxes
    for (let j = i + 1; j < promptBoxes.length; j++) {
        promptBoxes[j].className = 'prompt-box';
        promptBoxes[j].style.border = '1px solid var(--grayed-out-color)';
        promptBoxes[j].innerHTML = '';
    }
}

// //Current jumps should always have a value, even if it's 0
// function renderPrompts(promptTexts, i, jumpsA, current_jumps){
//     let prompts = document.getElementById("prompts")
//     // clearChildren(prompts)
//     console.log(`renderPrompts: ${promptTexts}, i: ${i}, jumpsA: ${jumpsA}`)
//     done = promptTexts.slice(0,i)
//     done.map((promptText, i) => prompts.append(makeDonePromptTag(promptText, jumpsA[i])))

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
//         prompts.append(makePromptTag(current, current_jumps))
        
//         todo.map(promptText => prompts.append(makePromptTag(promptText)))
//     }
// }
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
