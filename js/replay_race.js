let replayData = [];
let currentLapIndex = 0;
let replayTimer;
let isReplayPlaying = false;
let currentReplayYear = null;
let currentReplayRound = null;

// Variabili globali per la velocità base (1x)
const BASE_TICK_MS = 1200; // Tempo per cambiare giro
const BASE_TRANS_MS = 1000; // Tempo transizione grafica

function renderRaceReplay(year, round, raceName) {
    currentReplayYear = year;
    currentReplayRound = round;

    d3.select("#replay-race-title").text(raceName.toUpperCase());
    
    const container = d3.select("#replay-container");
    container.html("<p style='text-align:center; padding:50px; color:#666;'>Caricamento dati telemetrici in corso...</p>");

    // Resetta lo stato del play
    if (replayTimer) clearTimeout(replayTimer);
    isReplayPlaying = false;
    d3.select("#btn-play-replay").text("▶ Play");
    d3.select("#speed-select").property("value", "1"); // Resetta la velocità a 1x

    const url = `data/replays/${year}_${round}.json`;

    d3.json(url).then(data => {
        replayData = data.laps;
        const timelineData = data.timeline;
        const metadata = data.metadata;

        d3.select("#replay-race-subtitle").text(`Stagione ${year} - Round ${round}`);

        currentLapIndex = 0;
        
        const slider = d3.select("#lap-slider")
            .attr("max", replayData.length - 1)
            .property("value", 0);

        slider.on("input", function() {
            currentLapIndex = +this.value;
            updateReplay(currentLapIndex);
            // Se l'utente sposta lo slider manualmente, fermiamo l'autoplay per comodità
            if(isReplayPlaying) toggleReplayPlay(); 
        });

        // Event listener per gestire il cambio di velocità in tempo reale
        d3.select("#speed-select").on("change", function() {
            if (isReplayPlaying) {
                // Se era in play, fermiamo e facciamo ripartire per applicare il nuovo timer
                toggleReplayPlay(); 
                toggleReplayPlay();
            }
        });

        // Rimuoviamo eventuali vecchi listener prima di aggiungerne di nuovi
        d3.select("#btn-play-replay").on("click", null).on("click", toggleReplayPlay);

        // NUOVO: Listener per il bottone -1 Giro
        d3.select("#btn-prev-lap").on("click", null).on("click", function() {
            if (isReplayPlaying) toggleReplayPlay(); // Ferma l'autoplay se attivo
            if (currentLapIndex > 0) {
                currentLapIndex--;
                updateReplay(currentLapIndex);
            }
        });

        // NUOVO: Listener per il bottone +1 Giro
        d3.select("#btn-next-lap").on("click", null).on("click", function() {
            if (isReplayPlaying) toggleReplayPlay(); // Ferma l'autoplay se attivo
            if (currentLapIndex < replayData.length - 1) {
                currentLapIndex++;
                updateReplay(currentLapIndex);
            }
        });

        setupReplaySVG(timelineData, replayData.length - 1);
        updateReplay(currentLapIndex);

    }).catch(error => {
        console.error("Errore caricamento Replay:", error);
        container.html(`<p style='text-align:center; padding:50px; color:#e10600;'>Dati telemetrici non disponibili per questa gara (${year}).</p>`);
    });
}

function setupReplaySVG(timelineData, totalLaps) {
    const container = d3.select("#replay-container");
    container.selectAll("*").remove();

    const timelineContainer = d3.select("#timeline-svg-container");
    timelineContainer.selectAll("*").remove();

    const margin = { top: 20, right: 120, bottom: 20, left: 180 }; 
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 650 - margin.top - margin.bottom;

    // --- PREPARAZIONE DATI METEO ---
    // Aggreghiamo il meteo giro per giro in blocchi continui per D3
    const weatherPeriods = [];
    if (replayData && replayData.length > 0) {
        let currentW = replayData[0].weather.includes("Pioggia") ? "rain" : "sun";
        let startLap = 0;
        for (let i = 1; i <= totalLaps; i++) {
            let lapData = replayData[i];
            if (!lapData) continue;
            let w = lapData.weather.includes("Pioggia") ? "rain" : "sun";
            if (w !== currentW) {
                weatherPeriods.push({ type: currentW, start: startLap, end: i });
                currentW = w;
                startLap = i;
            }
        }
        weatherPeriods.push({ type: currentW, start: startLap, end: totalLaps });
    }

    // --- 1. DISEGNO DELLA TIMELINE (Container in alto) ---
    const timelineSvg = timelineContainer.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", 85) // Alzato a 70px per ospitare due barre
        .append("g")
        .attr("transform", `translate(${margin.left}, 45)`); // Spostato in basso (y=0 è la barra eventi)
        
    const lapScale = d3.scaleLinear()
        .domain([0, totalLaps])
        .range([0, width]);

    // ==========================================
    // BARRA METEO (Superiore)
    // ==========================================
    
    // Etichetta Meteo
    timelineSvg.append("text")
        .attr("x", -15)
        .attr("y", -24) // Posizionata in alto rispetto all'asse 0
        .attr("text-anchor", "end")
        .attr("alignment-baseline", "middle")
        .style("font-size", "14px")
        .text("☀️ / 🌧️");

    // Maschera di ritaglio (ClipPath) per mantenere i bordi arrotondati della barra
    timelineSvg.append("clipPath")
        .attr("id", "weather-clip")
        .append("rect")
        .attr("x", 0).attr("y", -28)
        .attr("width", width).attr("height", 8)
        .attr("rx", 4).attr("ry", 4);

    // Sfondo barra meteo
    timelineSvg.append("rect")
        .attr("x", 0).attr("y", -28)
        .attr("width", width).attr("height", 8)
        .attr("rx", 4).attr("ry", 4)
        .attr("fill", "#e0e0e0");

    // Segmenti Meteo
    timelineSvg.append("g")
        .attr("clip-path", "url(#weather-clip)")
        .selectAll(".weather-segment")
        .data(weatherPeriods)
        .enter().append("rect")
        .attr("x", d => lapScale(d.start))
        .attr("y", -28)
        .attr("width", d => Math.max(1, lapScale(d.end) - lapScale(d.start)))
        .attr("height", 8)
        .attr("fill", d => d.type === "sun" ? "#FADB5F" : "#4A90E2") // Giallo caldo vs Blu Pioggia
        .append("title")
        .text(d => d.type === "sun" ? `Sole (Giri ${d.start}-${d.end})` : `Pioggia (Giri ${d.start}-${d.end})`);


    // ==========================================
    // BARRA EVENTI (Inferiore)
    // ==========================================

    timelineSvg.append("rect")
        .attr("x", 0).attr("y", -6)
        .attr("width", width).attr("height", 12)
        .attr("rx", 6).attr("ry", 6)
        .attr("fill", "#e0e0e0")
        .attr("stroke", "#cccccc").attr("stroke-width", 1);

    timelineSvg.append("text")
        .attr("x", -15) 
        .attr("y", 0)
        .attr("text-anchor", "end")
        .attr("alignment-baseline", "middle")
        .style("font-weight", "900")
        .style("font-size", "12px")
        .style("fill", "#15151e")
        .text("START 🚥");

    timelineSvg.append("text")
        .attr("x", width + 15) 
        .attr("y", 0)
        .attr("text-anchor", "start")
        .attr("alignment-baseline", "middle")
        .style("font-weight", "900")
        .style("font-size", "12px")
        .style("fill", "#15151e")
        .text("🏁 FINISH");

    if (timelineData.sc_periods) {
        timelineSvg.selectAll(".sc-period-rect")
            .data(timelineData.sc_periods)
            .enter().append("rect").attr("class", "sc-period")
            .attr("x", d => lapScale(d.start)).attr("y", -6)
            .attr("width", d => Math.max(4, lapScale(d.end) - lapScale(d.start))).attr("height", 12)
            .attr("rx", 2)
            .append("title").text(d => `Safety Car (Giri ${d.start} - ${d.end})`);
    }

    if (timelineData.vsc_periods) {
        timelineSvg.selectAll(".vsc-period-rect")
            .data(timelineData.vsc_periods)
            .enter().append("rect").attr("class", "vsc-period")
            .attr("x", d => lapScale(d.start)).attr("y", -6)
            .attr("width", d => Math.max(4, lapScale(d.end) - lapScale(d.start))).attr("height", 12)
            .attr("rx", 2)
            .append("title").text(d => `Virtual Safety Car (Giri ${d.start} - ${d.end})`);
    }

    if (timelineData.events) {
        const eventsByLap = d3.group(timelineData.events, d => d.lap);
        eventsByLap.forEach((events, lap) => {
            const isRedFlag = events.some(e => e.type === "red_flag");
            const isRetirement = events.some(e => e.type === "retirement");
            const isDNS = events.some(e => e.type === "dns");
            const isOvertakeTrack = events.some(e => e.type === "overtake_track");
            const isOvertakePit = events.some(e => e.type === "overtake_pit");
            const isInherited = events.some(e => e.type === "position_inherited");

            let icon = "📍";
            if (isRedFlag) icon = "🔴";
            else if ((isRetirement || isDNS) && (isOvertakeTrack || isOvertakePit)) icon = "⚠️"; 
            else if (isRetirement || isDNS) icon = "💥";
            else if (isOvertakeTrack) icon = "⚔️"; 
            else if (isOvertakePit) icon = "🔄";   
            else if (isInherited) icon = "🎁"; 

            const tooltipText = events.map(e => `${e.driver.replace("_", " ").toUpperCase()}: ${e.text}`).join("\n");

            const eventNode = timelineSvg.append("g")
                .attr("transform", `translate(${lapScale(lap)}, 0)`)
                .style("cursor", "pointer")
                .on("click", () => {
                    currentLapIndex = lap;
                    d3.select("#lap-slider").property("value", lap);
                    updateReplay(lap);
                });

            eventNode.append("circle").attr("r", 9).attr("fill", "white").attr("stroke", "#999").attr("stroke-width", 1.5);
            eventNode.append("text")
                .attr("text-anchor", "middle").attr("alignment-baseline", "middle").attr("font-size", "11px")
                .text(icon)
                .append("title").text(`Giro ${lap}:\n${tooltipText}`);
        });
    }

    // --- 2. DISEGNO DELLE AUTO (Container in basso) ---
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
        
    svg.append("g").attr("class", "x-axis");
    svg.append("line")
        .attr("class", "finish-line")
        .attr("x1", width).attr("x2", width).attr("y1", 0).attr("y2", height)
        .attr("stroke", "#15151e").attr("stroke-width", 4)
        .attr("stroke-dasharray", "10,10"); 
}

function updateReplay(index) {
    if (!replayData || !replayData[index]) return;

    // --- LOGICA VELOCITÀ TRANSIZIONE ---
    const speedMultiplier = +d3.select("#speed-select").property("value") || 1;
    const currentTransMS = BASE_TRANS_MS / speedMultiplier;
    
    // Configura la transizione scalata
    const t = d3.transition().duration(currentTransMS).ease(d3.easeLinear);

    const lapData = replayData[index];
    const topDrivers = lapData.standings; 
    
    d3.select("#lap-display").text(`Giro ${lapData.lap} / ${replayData[replayData.length - 1].lap}`);
    d3.select("#lap-slider").property("value", index);
    

    const svg = d3.select("#replay-container svg g");
    const width = +d3.select("#replay-container svg").attr("width") - 180 - 120;
    const height = +d3.select("#replay-container svg").attr("height") - 50;

    const activeDrivers = topDrivers.filter(d => d.status_type === 'active');
    const currentMaxGap = d3.max(activeDrivers, d => d.gap_leader) || 1; 
    const x = d3.scaleLinear().domain([currentMaxGap, 0]).range([0, width]);

    const getX = d => {
        if (d.status_type === 'grid') return width;
        return Math.max(0, x(d.gap_leader));
    };

    const y = d3.scaleBand()
        .domain(topDrivers.map(d => d.driver))
        .range([0, height])
        .padding(0.2);

    svg.select(".x-axis")
        .transition().duration(400).ease(d3.easeLinear)
        .call(d3.axisTop(x).tickFormat(d => d === 0 ? "Leader" : `+${d}s`).ticks(6));

    const cars = svg.selectAll(".car-group")
        .data(topDrivers, d => d.driver);

    // --- FASE ENTER ---
    const carsEnter = cars.enter()
        .append("g")
        .attr("class", "car-group")
        .attr("transform", d => `translate(0, ${y(d.driver)})`);

    carsEnter.append("rect")
        .attr("class", "car-bar")
        .attr("height", y.bandwidth())
        .attr("x", 0)
        .attr("width", d => getX(d))
        .attr("fill", d => teamColors[d.team] || "#cccccc");

    // NUOVO: Tooltip al passaggio del mouse sull'intera riga
    carsEnter.append("title")
        .attr("class", "team-tooltip");

    // NUOVO: Testo interno alla barra per il nome della scuderia
    carsEnter.append("text")
        .attr("class", "team-label")
        .attr("x", 8) // Leggero margine sinistro interno alla barra
        .attr("y", y.bandwidth() / 2)
        .attr("text-anchor", "start")
        .attr("alignment-baseline", "middle")
        .style("font-size", "11px")
        .style("font-weight", "bold")
        .style("letter-spacing", "0.5px")
        .style("pointer-events", "none"); // Permette al mouse di attraversare il testo per attivare il tooltip


    carsEnter.append("image")
        .attr("class", "car-avatar")
        .attr("width", y.bandwidth() * 1.5)
        .attr("height", y.bandwidth() * 1.5)
        .attr("y", -y.bandwidth() * 0.25)
        .attr("clip-path", "circle(40%)")
        .attr("href", d => `assets/img/drivers/${d.driver}.jpg`)
        // FIX: Metodo nativo per forzare il fallback se l'immagine non esiste
        .attr("onerror", "this.setAttribute('href', 'assets/img/drivers/default-helmet.png')");

    carsEnter.append("text")
        .attr("class", "car-name")
        .attr("x", -15) // Leggermente più distanziato per dare respiro
        .attr("y", y.bandwidth() / 2)
        .attr("text-anchor", "end")
        .attr("alignment-baseline", "middle")
        .style("font-weight", "bold")
        .style("font-size", "12px");

    carsEnter.append("text")
        .attr("class", "car-gap")
        .attr("y", y.bandwidth() / 2)
        .attr("alignment-baseline", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("fill", "#333");

    // --- FASE UPDATE ---
    const carsUpdate = carsEnter.merge(cars);

    carsUpdate.transition(t)
        .attr("transform", d => `translate(0, ${y(d.driver)})`)
        .attr("class", d => `car-group status-${d.status_type}`);

    carsUpdate.select(".car-bar")
        .transition(t)
        .attr("width", d => getX(d));

    // NUOVO: Aggiorna il tooltip testuale
    carsUpdate.select(".team-tooltip")
        .text(d => `Scuderia: ${d.team.replace(/_/g, " ").toUpperCase()}`);

    // NUOVO: Aggiorna il testo, il colore e la visibilità della scuderia
    carsUpdate.select(".team-label")
        .text(d => d.team.replace(/_/g, " ").toUpperCase())
        .style("fill", d => {
            const hexColor = teamColors[d.team] || "#cccccc";
            // Se il colore della barra è bianco (es. Haas, Stewart), usa il grigio scuro
            return (hexColor.toUpperCase() === "#FFFFFF") ? "#333333" : "#FFFFFF";
        })
        .transition(t)
        .style("opacity", d => {
            // Se la larghezza della barra è minore di 70px, nasconde il testo in modo fluido
            return getX(d) > 70 ? 0.8 : 0; 
        });

    // L'avatar non va mai sotto x=0, mentre il nome è bloccato a x=-15
    carsUpdate.select(".car-avatar")
        .transition(t)
        .attr("x", d => Math.max(0, getX(d) - y.bandwidth() * 1.2))
        .attr("class", d => {
            const gapAhead = d.gap_to_ahead || 0;
            return (d.status_type === 'active' && gapAhead > 0 && gapAhead <= 1.0) ? "car-avatar battle-glow" : "car-avatar";
        });

    // Mappatura Icone (Podio + Ritiri) integrata direttamente nel nome
    const getIcon = (d) => {
        if (d.status_type === 'retired') {
            const r = d.status_text.toLowerCase();
            if (r.includes("engine") || r.includes("power") || r.includes("turbo")) return "⚙️";
            if (r.includes("collision") || r.includes("accident") || r.includes("crash")) return "💥";
            if (r.includes("spun") || r.includes("spin")) return "🔄";
            if (r.includes("hydraulics") || r.includes("gearbox") || r.includes("brakes")) return "🔧";
            return "❌";
        }
        if (d.position === 1) return "🏆";
        if (d.position === 2) return "🥈";
        if (d.position === 3) return "🥉";
        return "";
    };

    carsUpdate.select(".car-name")
        .text(d => {
            const icon = getIcon(d);
            const prefix = icon ? `${icon} ` : "";
            return `${prefix}${d.position}. ${d.driver.replace("_", " ").toUpperCase()}`;
        });

    // Testo del Gap: usa i valori formattati direttamente da Python
    carsUpdate.select(".car-gap")
        .transition(t)
        .attr("x", d => Math.max(y.bandwidth() * 1.6, getX(d) + 10)) 
        .attr("class", d => {
            if (d.pitting) return "car-gap pit-text"; 
            const gapAhead = d.gap_to_ahead || 0;
            return (d.status_type === 'active' && gapAhead > 0 && gapAhead <= 1.0) ? "car-gap gap-battle-text" : "car-gap";
        })
        .text(d => {
            let baseText = "";
            if (lapData.lap === 0) {
                baseText = "In Griglia";
            } else if (d.status_type === 'active' && d.position === 1) {
                // FIX TEMPO LEADER: Ora restituisce il tempo reale formattato da Python (es. 84:19.293)
                baseText = d.status_text; 
            } else if (d.status_type === 'active') {
                baseText = `+${d.gap_to_ahead.toFixed(3)}s`;
            } else {
                baseText = d.status_text;
            }
            
            return d.pitting ? baseText + " 🔧 BOX" : baseText;
        });

    cars.exit().transition(t).attr("opacity", 0).remove();
}

function toggleReplayPlay() {
    isReplayPlaying = !isReplayPlaying;
    const btn = d3.select("#btn-play-replay");
    
    if (isReplayPlaying) {
        btn.text("⏸ Pausa");
        
        if (currentLapIndex >= replayData.length - 1) {
            currentLapIndex = 0;
            updateReplay(currentLapIndex);
        }
        
        // Usa setTimeout invece di setInterval per poter variare la velocità a ogni giro
        function playNextFrame() {
            if (!isReplayPlaying) return;
            
            if (currentLapIndex < replayData.length - 1) {
                currentLapIndex++;
                updateReplay(currentLapIndex);
                
                // Ricalcola il tempo di attesa in base alla selezione attuale
                const speedMultiplier = +d3.select("#speed-select").property("value") || 1;
                replayTimer = setTimeout(playNextFrame, BASE_TICK_MS / speedMultiplier);
            } else {
                toggleReplayPlay(); // Mette in pausa alla fine
            }
        }
        
        // Avvia il loop
        const initialSpeed = +d3.select("#speed-select").property("value") || 1;
        replayTimer = setTimeout(playNextFrame, BASE_TICK_MS / initialSpeed);
        
    } else {
        btn.text("▶ Play");
        clearTimeout(replayTimer);
    }
}