function disableLinks(){
    links = document.getElementsByClassName("link")
    links = Array.from(links)
    links.map(link => link.classList.add("link--disabled"))
}

function clearChildren(element){
    while (element.lastChild) {
        element.removeChild(element.lastChild);
    }
}

function sessionEnded(prompt){
    ws_texts = ws_to_text()
    // console.log(`ws_texts: ${ws_texts}, prompt: ${prompt}`)
    return ws_texts[10] == prompt[1]
}
