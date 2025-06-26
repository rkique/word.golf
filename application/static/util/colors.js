window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', 'G-TRFQ36MDX8');

function changeColorMode() {
  currentMode = localStorage.getItem('darkMode')
  if (currentMode == 'true') { localStorage.setItem('darkMode', 'false'); }
  else { (localStorage.setItem('darkMode', 'true')) }
  syncColorMode()
}

function syncGraph(){
    jumpsArray = JSON.parse(localStorage.getItem('jumpsA') || null);
    // if (jumpsArray !== null) generateLineGraph(jumpsArray);
}
function syncColorMode() {
  currentMode = localStorage.getItem('darkMode')
  if (currentMode == 'true') {
    document.documentElement.style.setProperty('--hover-color', 'black');
    document.documentElement.style.setProperty('--emphasis-color', 'rgb(210, 199, 0)');
    document.documentElement.style.setProperty('--border-color', '#a9a9a9');
    document.documentElement.style.setProperty('--logo-color', '#ddd');
    document.documentElement.style.setProperty('--text-color', '#333333');
    document.documentElement.style.setProperty('--background-color', '#fff');
    document.documentElement.style.setProperty('--grayed-out-background', '#f3f3f3');
    document.documentElement.style.setProperty('--grayed-out-color', '#a0a0a0');
    document.documentElement.style.setProperty('--grayed-out-color-2', '#888');
  }
  else {
    document.documentElement.style.setProperty('--hover-color', 'white');
    document.documentElement.style.setProperty('--emphasis-color', 'rgb(255, 248, 119)');
    document.documentElement.style.setProperty('--border-color', '#666');
    document.documentElement.style.setProperty('--logo-color', '#ddd');
    document.documentElement.style.setProperty('--text-color', '#b1b1b1');
    document.documentElement.style.setProperty('--background-color', '#0d0d0d');
    document.documentElement.style.setProperty('--grayed-out-background', '#030303');
    document.documentElement.style.setProperty('--grayed-out-color', '#696969');
    document.documentElement.style.setProperty('--grayed-out-color-help-target', '#888');
    document.documentElement.style.setProperty('--grayed-out-color-unfocused', '#444');
  }
  // syncGraph()
  //PlotHistory(sessionHistory)
}
syncColorMode()
