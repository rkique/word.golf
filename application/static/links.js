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
    if(prompt[1] == word) 
        {
            link.className = "link link--target rainbow_text_animated"
            // console.log("I GOT TO THE TARGET WORD FINALLY");
            // so this is where makeLink is called 
        }
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


function tallyScreen(prompts, i, jumpsA){
    renderFinish(jumpsA)    
    // total = jumpsA.reduce((a, b) => a + b, 0)
    localStorage.setItem("lastComplete", data["date"])
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
    // alert("checking if session has ended")
    resp = sendAndReceiveXML(`end=true`)
    if(resp.hasOwnProperty('session_done') || debug_session_done){
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

function postWord(word) {
    console.log('postWord called with word:', word)
    resp = sendAndReceiveXML("word=" + word)
    renderLinks(resp.prompt, resp.results)
    renderPrompts(resp.prompts,resp.i, resp.jumpsA, resp.jumps)
    activateLinks()
}
