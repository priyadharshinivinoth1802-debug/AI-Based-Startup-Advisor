const form = document.getElementById("businessForm");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const submitButton = document.getElementById("submitButton");
const successScreen = document.getElementById("successScreen");
const anotherButton = document.getElementById("anotherButton");
const businessIdea = document.getElementById("businessIdea");
const ideaCount = document.getElementById("ideaCount");
const printButton = document.getElementById("printButton");
const scoreBreakdown = document.getElementById("scoreBreakdown");
const scoreLevel = document.getElementById("scoreLevel");
const priorityList = document.getElementById("priorityList");
const priorityCount = document.getElementById("priorityCount");
const scoreGauge = document.getElementById("scoreGauge");
const gaugeScore = document.getElementById("gaugeScore");

// Backend URL: same server when opened via http://localhost:3000, or set window.STARTUP_ADVISOR_API_URL.
// If no backend is reachable (e.g. GitHub Pages), the same algorithm runs in the browser (engine.js).
const API_URL = window.STARTUP_ADVISOR_API_URL || (location.protocol.startsWith("http") && location.hostname !== "github.io" && !location.hostname.endsWith(".github.io") ? "/api/analyze" : "");
const fields = form.querySelectorAll("input, select, textarea");

function updateProgress() {
    let completed = 0;
    fields.forEach(field => {
        if (field.value.trim() !== "") completed++;
    });
    const percentage = Math.round((completed / fields.length) * 100);
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${percentage}%`;
}

fields.forEach(field => {
    field.addEventListener("input", updateProgress);
    field.addEventListener("change", updateProgress);
});

businessIdea?.addEventListener("input", () => {
    ideaCount.textContent = businessIdea.value.length;
});

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value || "No specific information was generated.";
}

function renderAnalysis(result) {
    const analysis = result.analysis || {};
    const score = Number(result.algorithm?.readinessScore ?? 0);

    setText("resultTitle", "Your Startup Advice");
    setText("resultSummary", analysis.summary);
    setText("readinessScore", score);
    setText("gaugeScore", score);
    setText("scoreExplanation", result.algorithm?.explanation);

    const safeScore = Math.max(0, Math.min(100, score));
    document.getElementById("scoreFill").style.width = `${safeScore}%`;
    if (scoreGauge) scoreGauge.style.setProperty("--score", `${safeScore * 3.6}deg`);
    scoreLevel.textContent = result.algorithm?.level || "Assessment";
    scoreLevel.classList.remove("level-strong", "level-moderate", "level-early");
    scoreLevel.classList.add(safeScore >= 80 ? "level-strong" : safeScore >= 60 ? "level-moderate" : "level-early");

    const labels = {
        ideaClarity: ["Idea clarity", "15%"],
        problemClarity: ["Problem clarity", "15%"],
        customerSpecificity: ["Target-customer specificity", "15%"],
        differentiation: ["Differentiation", "15%"],
        stage: ["Startup stage", "10%"],
        traction: ["Customer traction", "10%"],
        funding: ["Funding readiness", "10%"],
        budget: ["Budget readiness", "10%"]
    };

    scoreBreakdown.innerHTML = Object.entries(result.algorithm?.components || {})
        .map(([key, value]) => {
            const [label, weight] = labels[key] || [key, ""];
            const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
            return `<div class="breakdown-row">
                <div class="breakdown-label"><span>${label}</span><small>${weight}</small></div>
                <div class="breakdown-track"><span style="width:${safeValue}%"></span></div>
                <strong>${safeValue}</strong>
            </div>`;
        }).join("");

    setText("ideaAnalysis", analysis.ideaAnalysis);
    setText("customerAnalysis", analysis.customerAnalysis);
    setText("marketAnalysis", analysis.marketAnalysis);
    setText("competitorAnalysis", analysis.competitorAnalysis);
    setText("budgetAnalysis", analysis.budgetAnalysis);
    setText("riskAnalysis", analysis.riskAnalysis);
    setText("marketingAnalysis", analysis.marketingSuggestions);
    setText("firstSteps", analysis.firstSteps);
    setText("actionPlan", analysis.actionPlan);

    const priorities = Array.isArray(result.algorithm?.priorities) ? result.algorithm.priorities : [];
    if (priorityList) {
        priorityList.innerHTML = priorities.map((item, index) => `
            <div class="priority-item">
                <div class="priority-number">${index + 1}</div>
                <div class="priority-content">
                    <div class="priority-title-row"><strong>${item.label}</strong><span>${item.score}/100</span></div>
                    <p>${item.action}</p>
                </div>
            </div>`).join("");
    }
    if (priorityCount) priorityCount.textContent = `${priorities.length} ${priorities.length === 1 ? "priority" : "priorities"}`;
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    submitButton.disabled = true;
    submitButton.innerHTML = "Analyzing your business... <span class='spinner'></span>";

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
        let result;
        try {
            if (!API_URL) throw new Error("no backend");
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            result = await response.json();
            if (!response.ok) { const e = new Error(result.error || "Analysis request failed."); e.fromServer = true; throw e; }
        } catch (err) {
            if (err.fromServer) throw err;
            result = window.AdvisorEngine.analyze(data); // offline / GitHub Pages fallback
        }

        renderAnalysis(result);

        form.style.display = "none";
        successScreen.classList.add("show");
        successScreen.scrollIntoView({ behavior: "smooth", block: "start" });

    } catch (error) {
        console.error("Analysis Error:", error);
        alert(`Unable to generate the analysis.\n\n${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = "Get My Startup Advice <span class='arrow'>→</span>";
    }
});

printButton?.addEventListener("click", () => window.print());

anotherButton.addEventListener("click", () => {
    form.reset();
    ideaCount.textContent = "0";
    progressBar.style.width = "0%";
    progressText.textContent = "0%";
    successScreen.classList.remove("show");
    form.style.display = "block";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    updateProgress();
});

updateProgress();
