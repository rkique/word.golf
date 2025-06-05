function toggleHelp() {
    if(document.getElementById("help") === null)
    {
        openHelp()
    }
    else {
        closeHelp()
    }

}

// // I am going to edit this help 
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

// function openHelp() {
//     if (document.getElementById("help") === null) {
//         const help = document.createElement("div");
//         help.className = "help";
//         help.id = "help";

//         const helpContainer = document.createElement("div");
//         helpContainer.className = "help_container";

//         // Array of slides (as HTML strings)
//         const slides = [
//             `<div class="help-slide">
//                 <h1>How to play</h1>
//                 <p>Get to a target word by clicking on semantic neighbors.</p>
//                 <p class='--grayed-out'>cement ⟶ lumber ⟶ forests ⟶ woodlands</p>
//             </div>`,
//             `<div class="help-slide">
//                 <p>As you get closer, the words will get more similar.</p>
//                 <p class='--grayed-out'>alphabet ⟶ rhyme ⟶ lyrical ⟶ duet ⟶ drummer ⟶ performer ⟶ newcomer ⟶ sophomore</p>
//             </div>`,
//             `<div class="help-slide">
//                 <p>Each target can be reached in two jumps!</p>
//                 <p class='--grayed-out'>fountain ⟶ piers ⟶ coastline</p>
//             </div>`,
//             `<div class="help-slide" style="text-align:center;">
//                 <button onclick='closeHelp()' class='switch switch--outlined'>Play</button>
//             </div>`
//         ];

//         let currentSlide = 0;
//         helpContainer.innerHTML = slides[currentSlide];
//         help.appendChild(helpContainer);
//         document.body.appendChild(help);

//         // Start slideshow
//         const interval = setInterval(() => {
//             console.log("here is the slide count");
//             console.log(currentSlide);
//             currentSlide++;
//             if (currentSlide >= slides.length) {
//                 clearInterval(interval);
//                 return;
//             }
//             helpContainer.innerHTML = slides[currentSlide];
//         }, 5000); // 1000 ms = 1 second
//     }
// }

function openHelp() {
    if (document.getElementById("help") === null) {
        const help = document.createElement("div");
        help.className = "help";
        help.id = "help";

        const helpContainer = document.createElement("div");
        helpContainer.className = "help_container";

        // Array of slides (as HTML strings)
        const slides = [
            `<div class="help-slide">
                <h1>How to play</h1>
                <p>Get to a target word by clicking on semantic neighbors.</p>
                <p class='--grayed-out'>cement ⟶ lumber ⟶ forests ⟶ woodlands</p>
                <img src="/static/util/images/first_word_gif.gif" alt="Demo" style="max-width:100%; height:auto;" />
            </div>`,
            `<div class="help-slide">
                <p>As you get closer, the words will get more similar.</p>
                <p class='--grayed-out'>alphabet ⟶ rhyme ⟶ lyrical ⟶ duet ⟶ drummer ⟶ performer ⟶ newcomer ⟶ sophomore</p>
                <img src="/static/util/images/second_word_gif.gif" alt="Demo" style="max-width:100%; height:auto;" />
            </div>`,
            `<div class="help-slide">
                <p>Each target can be reached in two jumps!</p>
                <p class='--grayed-out'>fountain ⟶ piers ⟶ coastline</p>
                <img src="/static/util/images/third_word_gif.gif" alt="Demo" style="max-width:100%; height:auto;" />
            </div>`,
            `<div class="help-slide" style="text-align:center;">
                <button onclick='closeHelp()' class='switch switch--outlined'>Play</button>
            </div>`
        ];

        let currentSlide = 0;

        // Function to update slide
        function updateSlide() {
            helpContainer.innerHTML = slides[currentSlide];
        }

        // Navigation arrows
        const leftArrow = document.createElement("button");
        leftArrow.innerHTML = "←";
        leftArrow.className = "help-arrow help-arrow-left";
        leftArrow.onclick = () => {
            if (currentSlide > 0) {
                currentSlide--;
                updateSlide();
            }
        };

        const rightArrow = document.createElement("button");
        rightArrow.innerHTML = "→";
        rightArrow.className = "help-arrow help-arrow-right";
        rightArrow.onclick = () => {
            if (currentSlide < slides.length - 1) {
                currentSlide++;
                updateSlide();
            }
        };

        // Initial render
        updateSlide();

        // Add everything to DOM
        help.appendChild(leftArrow);
        help.appendChild(helpContainer);
        help.appendChild(rightArrow);
        document.body.appendChild(help);
    }
}




function closeHelp(){
    help = document.getElementById("help")
    help.remove()
}