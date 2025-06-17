const MS_DAY = 86400000
let date = localStorage.getItem('current_date') || null;

if (date === null || date !== data['date']) {
    // alert("The game has been reset. Please start again.");
    // if the date is not set or does not match today, reset the game
    localStorage.setItem('current_prompt', 0);
    localStorage.setItem('jumpsA', JSON.stringify([]));
    localStorage.setItem('results', JSON.stringify([]));
    localStorage.setItem('jumps', 0);
    localStorage.setItem('previous_words', JSON.stringify([]));
}
