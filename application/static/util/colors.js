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
    jumpsArray = JSON.parse(localStorage.getItem('jumpsArray') || null);
    // if (jumpsArray !== null) generateLineGraph(jumpsArray);
}
function syncColorMode() {
  document.documentElement.style.setProperty('--failure', 'rgb(140, 0, 0)');
  document.documentElement.style.setProperty('--success', 'rgb(0, 70, 0)');
  document.documentElement.style.setProperty('--0', '#000');
  document.documentElement.style.setProperty('--2', '#2c2c2c');
  document.documentElement.style.setProperty('--4', '#515151');
  document.documentElement.style.setProperty('--c', '#d2d2d2');

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
    document.documentElement.style.setProperty('--text-color', '#a1a1a1');
    document.documentElement.style.setProperty('--background-color', '#030303');
    document.documentElement.style.setProperty('--grayed-out-background', '#181818');
    document.documentElement.style.setProperty('--grayed-out-color', '#696969');
    document.documentElement.style.setProperty('--grayed-out-color-help-target', '#888');
    document.documentElement.style.setProperty('--grayed-out-color-unfocused', '#444');
  }
  // syncGraph()
  //PlotHistory(sessionHistory)
}
syncColorMode()