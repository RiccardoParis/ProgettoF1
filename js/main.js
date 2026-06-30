// Limiti temporali focalizzati sui dati moderni (Lap Times disponibili)
const startYear = 1996;
const endYear = 2024;
let currentYear = 2024;

// Aggiungi questa mappa di colori all'inizio del file (fuori dalle funzioni)
const teamColors = {
    // Era Moderna
    "mercedes": "#00D2BE", "ferrari": "#DC0000", "red_bull": "#0600EF", 
    "mclaren": "#FF8700", "alpine": "#0090FF", "aston_martin": "#006F62", 
    "alfa": "#900000", "haas": "#FFFFFF", "williams": "#005AFF", "alphatauri": "#2B4562",
    "sauber": "#00E701", "racing_point": "#F596C8", "force_india": "#F596C8",
    "toro_rosso": "#0000FF", "lotus_f1": "#FFB800", "renault": "#FFF500",
    
    // Era Storica (Anni '70 - 2000)
    "benetton": "#008860", "tyrrell": "#000080", "brabham": "#F5F5F5", 
    "minardi": "#FFCC00", "ligier": "#0000FF", "arrows": "#FFA500",
    "jordan": "#FFD700", "brm": "#004225", "honda": "#FFFFFF", "toyota": "#FF0000",
    "jaguar": "#004225", "bmw_sauber": "#00008B", "brawn": "#B8FD1E",
    "stewart": "#FFFFFF", "prost": "#000080",
    
    // Anni '50 e '60
    "maserati": "#FF0000", "cooper": "#004225", "lotus": "#004225", "matra": "#0000FF"
};

// Setup del menù a tendina
const selectMenu = d3.select("#year-select");
const years = d3.range(endYear, startYear - 1, -1);
selectMenu.selectAll("option")
    .data(years).enter().append("option")
    .attr("value", d => d).text(d => d);
selectMenu.property("value", currentYear);

// Selezioni UI
const viewCalendar = d3.select("#calendar-view");
const viewRaceReplay = d3.select("#race-replay-view");
const btnBackCalendar = d3.select("#btn-back-calendar");

// Gestione del cambio anno
selectMenu.on("change", function() {
    currentYear = d3.select(this).property("value");
    
    // Se l'utente cambia anno mentre guarda un replay, lo riportiamo al calendario
    viewRaceReplay.classed("hidden", true);
    viewCalendar.classed("hidden", false);
    
    renderCalendar(currentYear);
});

// Funzione richiamata dal click sulla card in calendar.js
function openRaceReplay(year, round, raceName) {
    viewCalendar.classed("hidden", true);
    viewRaceReplay.classed("hidden", false);
    renderRaceReplay(year, round, raceName);
}

// Evento per il pulsante Indietro dal Replay
btnBackCalendar.on("click", function() {
    // Si assicura che l'animazione si fermi uscendo
    if (typeof isReplayPlaying !== 'undefined' && isReplayPlaying) {
        toggleReplayPlay(); 
    }
    viewRaceReplay.classed("hidden", true);
    viewCalendar.classed("hidden", false);
});

// Avvio Iniziale
renderCalendar(currentYear);