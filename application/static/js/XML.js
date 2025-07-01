let previous_response_text = []

// Check if this is correct or not 
function editSession(jumpsAValue, jumpsValue, result_value, i, prompt_text) {
    let xhttp = new XMLHttpRequest(); 
    xhttp.open("POST", "/editsession", false); 
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded"); 

    let message = `edit=true&jumpsArray=${encodeURIComponent(JSON.stringify(jumpsAValue))}&jumps=${encodeURIComponent(jumpsValue)}&result=${encodeURIComponent(JSON.stringify(result_value))}&i=${encodeURIComponent(i)}&prompt=${encodeURIComponent(JSON.stringify(prompt_text))}`; 
    
    xhttp.send(message); 

    if (xhttp.status === 200) {
        
        return xhttp.responseText; 
    } else {
        console.error("Error:", xhttp.status); 
        return null; 
    }
}


function send_game_data_to_backend(response_text, message) {
    jumps = response_text["jumps"]; 
    jumpsArray = response_text["jumpsArray"]; 
    results = response_text["results"]; 
    prompts = response_text["prompts"]; 
    current_prompt = response_text["i"]; 
    date = response_text["date"];

    let word = null;

    if (message.includes("word")) {
        word = message.split("=")[1];
    }

    // console.log("here is the word");
    // console.log("here is the message");
    // console.log(message);
    // console.log(word);
    // console.log("before backend fetch");

    fetch(`${window.backendURL}/update_game_state`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ...(word ? { word: word } : {}),
            current_jumps: jumps,
            jumpsA: jumpsArray,
            results: results,
            prompts: prompts,
            prompt_idx: current_prompt,
            date: date
        })
    })
        .then(response => response.json())
        .then(update_state => {
            return update_state;
        });
}

function simToIndex(score){
    const thresholds = [0.2, 0.27, 0.35, 0.42];
    let idx = thresholds.findIndex(t => score < t);
    idx = idx === -1 ? thresholds.length : idx;
    return idx;
}

//updates jumpsA with most recent score. 
function updateJumpsA(jumpsA, score){
    const lastWordIdx = simToIndex(score)
    let zeroRowIdx = jumpsA.findIndex(row => row.every(val => val === 0));
    let insertIdx = Math.max(0, zeroRowIdx === -1 ? jumpsA.length : zeroRowIdx - 1);
    jumpsA[insertIdx][lastWordIdx] += 1
    return jumpsA
}

function sendAndReceiveXML(message) {
    // alert(`[sendAndReceiveXML] Sending message: ${message}`);
    let xhttp = new XMLHttpRequest();
    xhttp.open("POST", '/', false);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send(message);
    resp = {}
    if (xhttp.responseText.startsWith("help_session_done")) {
        j = JSON.parse(xhttp.responseText.substring(17));
        j['help_session_done'] = 1
        console.log("[help_session_done] Session is done, returning jumps and results")
        return j
    }
    if (xhttp.responseText.startsWith("session_done"))
    {
        j = JSON.parse(xhttp.responseText.substring(12));
        j['session_done'] = 1
        console.log("[session_done] Session is done, returning jumps and results")
        return j
    }
    else {
        try {
            response_text = JSON.parse(xhttp.responseText);
            jumps = response_text["jumps"]; 
            jumpsArray = response_text["jumpsArray"]; 
            results = response_text["results"]; 
            prompts = response_text["prompts"]; 
            current_prompt = response_text["i"]; 
            // console.log(`[Send and Receive XML] results: ${results} jumpsArray : ${jumpsArray} prompts ${prompts}`);
            if (jumps >= 12 ) { // cap it at 12 current jumps
                let resp = sendAndReceiveXML(`end=true`);
                resp.jumpsA = updateJumpsA(resp.jumpsA, resp.previous_words[-1], resp.score)
                _ = send_game_data_to_backend(resp, `end=true`);
                clearLastTallyContainer(resp.jumpsArray.length);
                return resp;
            } else {
                return response_text;
            }     
        } catch (e) {
            alert('Error in backend. Please check logs.')
            console.log(e)
        }
    }
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
        }
    };
}
