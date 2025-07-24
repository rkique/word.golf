function disableLinks(){
    links = document.getElementsByClassName("link")
    links = Array.from(links)
    links.map(link => {
        link.classList.add("link--disabled");
        if (link.classList.contains("link--target")) {
            link.classList.remove("link--target");
            if (link.id === "rainbow_text_animated") {
                link.removeAttribute("id");
            }
        }
    });
}

function clearChildren(element){
    while (element.lastChild) {
        element.removeChild(element.lastChild);
    }
}

function ws_to_text(){
    let wordspace = document.getElementById("wordspace")
    ws_array = Array.from(wordspace.children)
    return ws_array.map(el => el.firstChild.innerText)
}

//Checks if the middle element is the target.
function promptEnded(prompt){
    ws_texts = ws_to_text()
    if (ws_texts.length < 21) {
        return false
    }
    middle_idx = Math.floor(ws_texts.length / 2)
    let isSessionOver = ws_texts[middle_idx] == prompt[1]
    console.log("[prompt Ended]: ", prompt)
    console.log("[prompt Ended]: ", ws_texts)
    return isSessionOver

}
