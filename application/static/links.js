// To quickly access the final screen, enter maintainLinks('', true)

/* makes and renders links */

function makeLink(prompt,word) {
    let link = document.createElement("button");
    let span = document.createElement("span")
    span.innerText = word;
    /*if (word.length < 20){span.style.fontSize = "1.5em"}
    if (word.length < 12){span.style.fontSize = "2.5em"}
    if (word.length < 10){span.style.fontSize = "3em"}
    if (word.length < 8){span.style.fontSize = "3.75em"}*/
    link.appendChild(span)
    link.className = "link"
    if(prompt[1] == word){link.className = "link link--target rainbow_text_animated"}
    return link
}

function makeStartLink(prompt, word){
    startLink = makeLink(prompt, word)
    startLink.className = "link link--disabled link--starting"
    return startLink
}


function maintainLinks(prompt, debug_session_done=false){    
    if(sessionEnded(prompt) || debug_session_done){
            alert('sse from ml')
    disableLinks()
    saySessionEnded(debug_session_done)
}}

function freezeScreen(){
    screen = new XMLSerializer().serializeToString(document)
    localStorage.setItem('screen', screen)
}

function showScreen(){
    document.body.innerHTML = localStorage.getItem('screen')
}

function tallyScreen(prompts, i, jumpsA){
    streak = 1
    renderFinish(jumpsA, streak)
    // total = jumpsA.reduce((a, b) => a + b, 0)
    localStorage.setItem("lastComplete", new Date())
    // localStorage.setItem('total', JSON.stringify(jumpsA))
    renderPrompts(prompts,i, jumpsA, false)
    // 
    window.addEventListener('DOMContentLoaded', () => {
        fetch("https://word-golf-backend.onrender.com", {
            method: "GET",
            credentials: "include"
        })
        .then(response => response.json())
        .then(data => {
            console.log(data.message);
            
        });
    });

    freezeScreen()
}

//checks if session has ended.
function saySessionEnded(debug_session_done){
    resp = sendAndReceiveXML(`end=true`)
    if(resp.hasOwnProperty('session_done') || debug_session_done){
        console.log('Session ended!')
        tallyScreen(resp.prompts, resp.i, resp.jumpsA)
    }
    else {
    renderToFrom(resp.prompt);
    renderLinks(resp.prompt, resp.results)
    renderPrompts(resp.prompts, resp.i, resp.jumpsA, resp.jumps)
    activateLinks()
    }
}

function renderLinks(prompt, results){
    let wordspace = document.getElementById("wordspace")
    clearChildren(wordspace)
    let middleIndex = Math.floor(results.length / 2)
    results.forEach((result, idx) => {
        if (idx === middleIndex) {
            wordspace.append(makeStartLink(prompt, result))
        } else {
            wordspace.append(makeLink(prompt, result))
        }
    })
    maintainLinks(prompt)
}

function ws_to_text(){
    let wordspace = document.getElementById("wordspace")
    ws_array = Array.from(wordspace.children)
    return  ws_array.map(el => el.firstChild.innerText)
}

//activates links on the page
function activateLinks(){
    ws_texts = ws_to_text()
    ws_array.map(function(el, i){el.onclick = function() {
        postWord(ws_texts[i], el);
    }})
}

// function postWord(word) {
//     console.log('postWord called with word:', word)
//     resp = sendAndReceiveXML("word=" + word)
//     renderLinks(resp.prompt, resp.results)
//     renderPrompts(resp.prompts,resp.i, resp.jumpsA, resp.jumps)
//     activateLinks()
// }

function animateToCenter(clickedElem, container, sendXMLAfterAnimation) {
    // Clone the clicked element
    const clone = clickedElem.cloneNode(true);
    const initialRect = clickedElem.getBoundingClientRect();

    // Copy computed styles exactly
    const computedStyle = window.getComputedStyle(clickedElem);
    for (let prop of computedStyle) {
        clone.style.setProperty(prop, computedStyle.getPropertyValue(prop), computedStyle.getPropertyPriority(prop));
    }

    // Style the clone for absolute positioning
    clone.style.position = 'fixed';
    clone.style.left = `${initialRect.left}px`;
    clone.style.top = `${initialRect.top}px`;
    clone.style.width = `${initialRect.width}px`;
    clone.style.height = `${initialRect.height}px`;
    clone.style.margin = '0';
    clone.style.zIndex = '1000';
    clone.style.pointerEvents = 'none';

    // Place the clone on top of everything
    document.body.appendChild(clone);

    // Get the center of the container
    const containerRect = container.getBoundingClientRect();
    const centerX = containerRect.left + containerRect.width / 2 - initialRect.width / 2;
    const centerY = containerRect.top + containerRect.height / 2 - initialRect.height / 2;

    // Force reflow
    clone.getBoundingClientRect();

    // Animate to center
    clone.style.transition = 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1), opacity 500ms';
    clone.style.transform = `translate(${centerX - initialRect.left}px, ${centerY - initialRect.top}px)`;
    clone.style.opacity = '0.5';

    // Remove the clone after animation
    clone.addEventListener('transitionend', () => {
        clone.remove();
        sendXMLAfterAnimation();
    }, { once: true });
}

function postWord(word, clickedElem) {
    console.log('postWord called with word:', word);
    const wordspace = document.getElementById("wordspace");
    function sendXMLAfterAnimation() {
        // for end=True to be set.
        const resp = sendAndReceiveXML("word=" + word);
        if (word == resp.prompt[1]) {
            saySessionEnded();
            // If we've finished five prompts, we end the session.
            if (resp.i == 5) {
                renderLinks(resp.prompt, resp.results);
                let links = document.getElementsByClassName("link");
                links = Array.from(links);
                links.forEach(link => link.classList.add("link--disabled"));
                freezeScreen();
                return;
            }
        }
        renderLinks(resp.prompt, resp.results);
        renderPrompts(resp.prompts, resp.i, resp.jumpsA, resp.jumps);
        activateLinks();
    }
    animateToCenter(clickedElem, wordspace, sendXMLAfterAnimation);
}

