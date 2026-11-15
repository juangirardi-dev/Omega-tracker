
(() => {
  const history = () => state.history || [];

  const style = document.createElement("style");
  style.textContent = `
    .omega-history-item {
      border-top: 1px solid var(--line);
      padding: 12px 0;
    }
    .omega-detail {
      display: none;
      background: #101512;
      padding: 10px;
      border-radius: 10px;
      margin-top: 8px;
    }
    .omega-detail.open { display: block; }
    .omega-chart {
      display: flex;
      align-items: end;
      gap: 7px;
      height: 120px;
      padding: 12px 4px;
    }
    .omega-bar {
      flex: 1;
      min-width: 12px;
      background: var(--lime);
      border-radius: 5px 5px 0 0;
    }
    .omega-pr {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid var(--line);
      font-size: 13px;
    }
  `;
  document.head.appendChild(style);

  const footer = document.querySelector("footer");

  const panel = document.createElement("div");
  panel.innerHTML = `
    <section class="card">
      <div class="row">
        <h2>Träningshistorik</h2>
        <span class="muted" id="omegaHistoryCount">0 pass</span>
      </div>
      <div id="omegaHistoryList"></div>
    </section>

    <section class="card">
      <h2>Progression</h2>
      <select id="omegaExercise"
        style="width:100%;padding:10px;background:#111;color:white">
      </select>
      <div id="omegaProgress"></div>
    </section>

    <section class="card">
      <h2>Personliga rekord</h2>
      <div id="omegaRecords"></div>
    </section>
  `;

  footer.before(panel);

  function date(value) {
    return new Date(value).toLocaleDateString("sv-SE");
  }

  function render() {
    const entries = history();

    document.getElementById("omegaHistoryCount").textContent =
      entries.length + " pass";

    document.getElementById("omegaHistoryList").innerHTML =
      entries.length ? entries.map((h, i) => `
        <div class="omega-history-item">
          <div class="row">
            <div>
              <b>Dag ${h.day}</b>
              <div class="muted">${date(h.date)}</div>
              <div class="muted">${h.sets || 0} avklarade set</div>
            </div>
            <button data-show="${i}">Visa</button>
            <button data-remove="${i}">Ta bort</button>
          </div>
          <div class="omega-detail" id="omegaDetail${i}">
            ${(h.exercises || []).map(e => `
              <p class="muted">
                ${e.name}: ${e.weight || "—"} kg ×
                ${e.reps || "—"} reps ·
                ${e.completed || 0}/${e.sets || 0} set
              </p>
            `).join("") || '<p class="muted">Äldre pass utan detaljer.</p>'}
          </div>
        </div>
      `).join("") :
      '<p class="muted">Dina sparade träningspass visas här.</p>';

    const names = [...new Set(
      plans.flatMap(p => p.items.map(x => x[0]))
    )];

    const select = document.getElementById("omegaExercise");
    const previous = select.value;

    select.innerHTML = names.map(n =>
      `<option value="${n}">${n}</option>`
    ).join("");

    if (names.includes(previous)) select.value = previous;

    renderProgress();
    renderRecords();
  }

  function renderProgress() {
    const name = document.getElementById("omegaExercise").value;

    const points = history()
      .filter(h => h.exercises)
      .map(h => ({
        date: h.date,
        exercise: h.exercises.find(e => e.name === name)
      }))
      .filter(x => x.exercise && Number(x.exercise.weight) > 0);

    const area = document.getElementById("omegaProgress");

    if (!points.length) {
      area.innerHTML =
        '<p class="muted">Spara vikter i ett träningspass för att se progression.</p>';
      return;
    }

    const max = Math.max(
      ...points.map(x => Number(x.exercise.weight))
    );

    area.innerHTML = `
      <p class="muted">
        Senaste vikt: ${points[points.length - 1].exercise.weight} kg
        · Bästa: ${max} kg
      </p>
      <div class="omega-chart">
        ${points.slice(-10).map(x => `
          <div class="omega-bar"
            title="${x.exercise.weight} kg"
            style="height:${Math.max(5,
              Number(x.exercise.weight) / max * 95)}px">
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderRecords() {
    const best = {};

    history().filter(h => h.exercises).forEach(h => {
      h.exercises.forEach(e => {
        const weight = Number(e.weight);

        if (weight > 0 &&
            (!best[e.name] || weight > best[e.name].weight)) {
          best[e.name] = {
            weight,
            reps: e.reps || "—"
          };
        }
      });
    });

    document.getElementById("omegaRecords").innerHTML =
      Object.entries(best).map(([name, value]) => `
        <div class="omega-pr">
          <b>${name}</b>
          <span>${value.weight} kg × ${value.reps}</span>
        </div>
      `).join("") ||
      '<p class="muted">Inga personliga rekord ännu.</p>';
  }

  document.getElementById("omegaExercise")
    .addEventListener("change", renderProgress);

  document.getElementById("omegaHistoryList")
    .addEventListener("click", event => {
      const show = event.target.closest("[data-show]");
      const remove = event.target.closest("[data-remove]");

      if (show) {
        document.getElementById("omegaDetail" + show.dataset.show)
          .classList.toggle("open");
      }

      if (remove && confirm("Ta bort träningspasset?")) {
        state.history.splice(Number(remove.dataset.remove), 1);
        save();
        render();
      }
    });

  $("finish").onclick = () => {
    const now = new Date();
    const exercises = plans[day].items.map((item, i) => ({
      name: item[0],
      sets: item[1],
      completed: state.done[day][i].filter(Boolean).length,
      weight: state.records[day][i].weight || "",
      reps: state.records[day][i].reps || ""
    }));

    state.history = history();

    state.history.push({
      day: day + 1,
      date: now.toISOString(),
      sets: state.done[day].flat().filter(Boolean).length,
      totalSets: total(plans[day]),
      exercises
    });

    save();
    render();

    $("message").textContent =
      "Träningspasset är sparat i OMEGA TRACKER!";
  };

  render();
})();
