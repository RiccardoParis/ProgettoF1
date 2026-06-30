// js/calendar.js

function renderCalendar(year) {
    // 1. Definiamo il percorso del file JSON appena generato dallo script Python
    const url = `data/calendars/calendar_${year}.json`;

    // 2. Puntiamo al contenitore specifico per il calendario
    const container = d3.select("#calendar-timeline");

    // 3. Caricamento dei dati
    d3.json(url).then(data => {
        // Pulizia del contenitore prima di un nuovo render
        container.selectAll("*").remove();

        // --- INIZIO DATA BINDING D3 ---

        // Creiamo una card per ogni singola gara
        const circuitCards = container.selectAll(".circuit-card")
            .data(data.races)
            .enter()
            .append("div")
            .attr("class", "circuit-card")
            .style("cursor", "pointer") // Fa capire all'utente che è cliccabile
            .on("click", function(event, d) {
        // Supponendo che 'd' contenga i dati della gara
        openRaceReplay(currentYear, d.round, d.raceName); 
    });

        // Badge del round (in alto a destra grazie al CSS position: absolute)
        circuitCards.append("div")
            .attr("class", "round-badge")
            .text(d => `Round ${d.round}`);

        // Nome del Gran Premio
        circuitCards.append("h3")
            .style("margin", "0 0 5px 0")
            .style("font-size", "1.2rem")
            .text(d => d.raceName);

        // Nome specifico del circuito e località
        circuitCards.append("p")
            .style("margin", "0 0 10px 0")
            .style("font-size", "0.9rem")
            .style("color", "#666")
            .html(d => `<strong>${d.circuitName}</strong><br>${d.location}`);

        // Immagine del tracciato
        circuitCards.append("img")
            .attr("class", "circuit-img")
            // Cerca l'immagine usando il circuitRef (es. monza.png)
            .attr("src", d => `assets/img/circuits/${d.circuitRef}.png`)
            .attr("alt", d => `Tracciato di ${d.circuitName}`)
            .on("error", function() {
                // Fallback: se l'immagine non esiste, carica il tracciato di default
                d3.select(this).attr("src", "assets/img/circuits/default-track.png");
                // Rimuove l'ascoltatore per evitare loop se manca anche il default
                d3.select(this).on("error", null); 
            });

        // Data della gara
        circuitCards.append("div")
            .attr("class", "circuit-date")
            .text(d => {
                // Formattazione basica della data (se disponibile)
                if (d.date && d.date !== "Data non disponibile") {
                    const dateObj = new Date(d.date);
                    return dateObj.toLocaleDateString('it-IT', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                    });
                }
                return d.date;
            });

    }).catch(error => {
        console.error("Errore nel caricamento del calendario:", error);
        container.html(`<p style='color: red; grid-column: 1/-1;'>Dati del calendario non trovati per il ${year}. Verifica di aver lanciato lo script Python.</p>`);
    });
}