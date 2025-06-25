let previous_response_text = []

// Check if this is correct or not 
function editSession(jumpsAValue, jumpsValue, result_value, i, prompt_text) {
    let xhttp = new XMLHttpRequest(); 
    xhttp.open("POST", "/editsession", false); 
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded"); 

    let message = `edit=true&jumpsA=${encodeURIComponent(JSON.stringify(jumpsAValue))}&jumps=${encodeURIComponent(jumpsValue)}&result=${encodeURIComponent(JSON.stringify(result_value))}&i=${encodeURIComponent(i)}&prompt=${encodeURIComponent(JSON.stringify(prompt_text))}`; 
    
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
    jumpsA = response_text["jumpsA"]; 
    results = response_text["results"]; 
    prompts = response_text["prompts"]; 
    current_prompt = response_text["i"]; 

    let word = null;

    if (message.includes("word")) {
        word = message.split("=")[1];
    }

    console.log("here is the word");
    console.log("here is the message");
    console.log(message);
    console.log(word);
    console.log("before backend fetch");

    fetch(`${window.backendURL}/update_game_state`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ...(word ? { word: word } : {}),
            current_jumps: jumps,
            jumpsA: jumpsA,
            results: results,
            prompts: prompts,
            prompt_idx: current_prompt
        })
    })
        .then(response => response.json())
        .then(update_state => {
            return update_state;
        });
}

function sendAndReceiveXML(message) {
    // alert(`[sendAndReceiveXML] Sending message: ${message}`);
    let xhttp = new XMLHttpRequest();
    xhttp.open("POST", '/', false);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send(message);
    resp = {}
    console.log(`[sendAndReceiveXML] Response from ${message}: `, xhttp.responseText);
    if (message.startsWith('end')) {
        let prompt_count = parseInt(localStorage.getItem('prompt_idx')) || 0;
        localStorage.setItem('prompt_idx', prompt_count + 1);
    }
    if (xhttp.responseText.startsWith("help_session_done")) {
        j = JSON.parse(xhttp.responseText.substring(17));
        j['help_session_done'] = 1
        console.log("[help_session_done] Session is done, returning jumps and results")
        console.log("here is the finish of the help session")
        console.log(j)
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
            jumpsA = response_text["jumpsA"]; 
            results = response_text["results"]; 
            prompts = response_text["prompts"]; 
            current_prompt = response_text["i"]; 
            console.log("after backend fetch")
            // handle update_state if needed
            console.log(`[Send and Receive XML] results: ${results} jumpsA : ${jumpsA} prompts ${prompts}`);
            // fix this localstorage issue!!!
            
            console.log(response_text)
            console.log("about to return from sendandreceivexml")
            if (jumps >= 12 ) { // cap it at 12 current jumps
                let resp = sendAndReceiveXML(`end=true`);
                _ = send_game_data_to_backend(resp, `end=true`);
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
