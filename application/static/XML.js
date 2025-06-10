let previous_response_text = []

// Check if this is correct or not 
function callEditSesh(jumpsAValue, jumpsValue, result_value, i, prompt_text) {
    let xhttp = new XMLHttpRequest();
    xhttp.open("POST", "/editsesh", false); 
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



function sendAndReceiveXML(message, flag) {
    let xhttp = new XMLHttpRequest();
    xhttp.open("POST", '/', false);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    
    xhttp.send(message);
    resp = {}
    if (message.startsWith('end')) {
        console.log("Here I reached the target word");
        // data = JSON.parse('{{data|tojson|safe}}');
        // console.log("I am in sendandreceiveXML here is the data");
        // console.log(data);
        // this is correct here 
        if (!flag) {
            let prompt_count = parseInt(localStorage.getItem('current_prompt')) || 0;
            localStorage.setItem('current_prompt', prompt_count + 1);
        } 

    }
    if (xhttp.responseText.startsWith("session_done"))
    {
        j = JSON.parse(xhttp.responseText.substring(12));
        j['session_done'] = 1
        return j
    }
    else {
        try { 
            
            response_text = JSON.parse(xhttp.responseText);
            
            // console.log("here is the flag")
            // console.log(flag)

            if (!flag) {
                localStorage.setItem('jumps', JSON.parse(xhttp.responseText)["jumps"]);
                localStorage.setItem('jumpsA', JSON.parse(xhttp.responseText)["jumpsA"]);
                localStorage.setItem('results', JSON.parse(xhttp.responseText)["results"]);
                
                // curr_jmp_list = localStorage.getItem('jumpsA');
                // // console.log("here is the json jumpsA");
                // // console.log(JSON.parse(xhttp.responseText)["jumpsA"]);
                // // make local storage append the last value so it will work
                // let last_val = JSON.parse(xhttp.responseText)["jumpsA"][JSON.parse(xhttp.responseText)["jumpsA"].length -1];
                // // console.log("here is the last value")
                // // console.log(last_val);
                // let stored = localStorage.getItem('jumpsA') || null;
                // let jumps_array;
                // if (stored) {
                //     jumps_array = stored
                //     ? stored.split(',').map(s => s.trim()) 
                //     : null;
                // } else {
                //     jumps_array = null
                // }
                // if (jumps_array) {
                //     console.log("here is jumps array");
                //     console.log(jumps_array);
                //     console.log("here is i");
                //     console.log(JSON.parse(xhttp.responseText)["i"]);
                //     jumps_array.push(last_val);
                //     localStorage.setItem('jumpsA', jumps_array);
                // } else {
                //     localStorage.setItem('jumpsA', JSON.parse(xhttp.responseText)["jumpsA"]);
                // }
            } 
            
            return JSON.parse(xhttp.responseText);
        } catch (e) {
            
            alert(xhttp.responseText)
        }
    }
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
        }
    };
}
