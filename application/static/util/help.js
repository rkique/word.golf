// function toggleHelp() {
//     if(document.getElementById("help") === null)
//     {
//         openHelp()
//     }
//     else {
//         closeHelp()
//     }

// }
// function openHelp() {
//     if(document.getElementById("help") === null){
//     const help = document.createElement("div");
//     const help_container = document.createElement("div");
//     help.append(help_container)
//     help.className = "help"
//     help.id = "help"
//     help_container.className = "help_container"
//     help_container.innerHTML =  
//     ` 
//     <h1>How to play</h1>
//     <div class='help-text'>
//     <p> Get to a target word by clicking on semantic neighbors. </p>
//     <p class='--grayed-out'> cement ⟶ lumber ⟶ forests ⟶ woodlands </p>
//     <p>As you get closer, the words will get more similar. </p>
//     <p class='--grayed-out'> alphabet ⟶ rhyme ⟶ lyrical ⟶ duet ⟶ drummer ⟶ performer ⟶ newcomer ⟶ sophomore </p>
//     <p>Each target can be reached in two jumps!  </p>
//     <p class='--grayed-out'> fountain ⟶ piers ⟶ coastline </p>
//     </div>
//     <button onclick='closeHelp()' class='switch switch--outlined'> play </button>
//     `;
//     document.body.appendChild(help);
//     }
// }


// function closeHelp(){
//     help = document.getElementById("help")
//     help.remove()
// }