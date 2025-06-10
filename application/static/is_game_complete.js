const MS_DAY = 86400000
if(Math.round(Date.parse(new Date()) / MS_DAY) == Math.round(Date.parse(localStorage.getItem("lastComplete")) / MS_DAY)){
    showScreen()
}