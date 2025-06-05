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
    renderFinish(jumpsA)
    // total = jumpsA.reduce((a, b) => a + b, 0)
    // localStorage.setItem("lastComplete", new Date())
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
    return ws_array.map(el => el.firstChild.innerText)
}

//activates links on the page
function activateLinks(){
    ws_texts = ws_to_text()
    ws_array.map(function(el, i){el.onclick = function() {
        postWord(ws_texts[i])
    }})
}

function postWord(word) {
    console.log('postWord called with word:', word)
    resp = sendAndReceiveXML("word=" + word)
    renderLinks(resp.prompt, resp.results)
    renderPrompts(resp.prompts,resp.i, resp.jumpsA, resp.jumps)
    activateLinks()
    }
