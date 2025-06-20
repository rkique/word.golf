const MS_DAY = 86400000
let date = localStorage.getItem('current_date') || null;

if (date === null || date !== data['date']) {
    alert("The game has been reset. Please start again.");
    // if the date is not set or does not match today, reset the game
    // console.log("")
    // Clear all localStorage except for 'streak', 'lastComplete', 'currentDate', and 'is_help'
    const keepKeys = ['streak', 'lastComplete', 'currentDate', 'is_help'];
    Object.keys(localStorage).forEach(key => {
        if (!keepKeys.includes(key)) {
            localStorage.removeItem(key);
        }
    });
}
