// Replace with your Render backend URL
const apiUrl = 'https://monte-carlo-api.onrender.com/simulate';

function simulateProgressBar(durationMs = 10000) {
  return new Promise((resolve) => {
    const container = document.getElementById('progressContainer');
    const bar = document.getElementById('progressBar');
    const estimate = document.getElementById('progressEstimate');

    container.style.display = 'block';
    bar.style.width = '0%';
    bar.setAttribute('aria-valuenow', 0);
    bar.textContent = '0%';

    const startTime = Date.now();
    const interval = 100;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / durationMs) * 100, 100);
      bar.style.width = `${progress.toFixed(0)}%`;
      bar.setAttribute('aria-valuenow', progress.toFixed(0));
      bar.textContent = `${progress.toFixed(0)}%`;

      const remaining = Math.max(0, (durationMs - elapsed) / 1000).toFixed(1);
      estimate.textContent = `~${remaining} seconds remaining`;

      if (progress >= 100) {
        clearInterval(timer);
        estimate.textContent = `Finishing...`;
        resolve();
      }
    }, interval);
  });
}

document.getElementById('runButton').addEventListener('click', async () => {
  const runButton = document.getElementById('runButton');
  runButton.disabled = true;
  runButton.innerText = 'Running...';

  // Collect form values
  const history_years = parseInt(document.getElementById('history_years').value);
  const drift_adjust = parseFloat(document.getElementById('drift_adjust').value) / 100;
  const horizons = document.getElementById('simulation_horizons').value
                     .split(',')
                     .map(s => parseInt(s.trim()))
                     .filter(n => !isNaN(n));
  const index_symbol = document.getElementById('index_symbol').value.trim().toUpperCase();
  const simulation_type = document.getElementById('simulation_type').value;
  const rebased = document.getElementById('rebased').checked;
  const num_simulations = parseInt(document.getElementById('num_simulations').value);

  const payload = {
    history_years,
    drift_adjust,
    simulation_horizons: horizons,
    index_symbol,
    simulation_type,
    rebased,
    num_simulations
  };

  document.getElementById('results').innerHTML = "";
  const progressPromise = simulateProgressBar(10000);

  try {
    const fetchPromise = fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const [res] = await Promise.all([fetchPromise, progressPromise]);

    const data = await res.json();
    if (data.status !== "success") {
      document.getElementById('results').innerHTML = `<div class='alert alert-danger'>Error: ${data.message}</div>`;
      return;
    }

    document.getElementById('progressContainer').style.display = 'none';

    // Display results
    let html = `<h3>Summary Data</h3><table class='table table-bordered'><tbody>`;
    const summary = data.summary_data;
    const metrics = summary['Metric'];
    const explanations = summary['Explanation'];
    for (let i = 0; i < metrics.length; i++) {
      html += `<tr><th>${metrics[i]}</th><td>${explanations[i]}</td>`;
      for (const horizon in summary) {
        if (!["Metric", "Explanation"].includes(horizon)) {
          html += `<td>${summary[horizon][i]}</td>`;
        }
      }
      html += `</tr>`;
    }
    html += `</tbody></table>`;
    document.getElementById('results').innerHTML = html;

  } catch (error) {
    document.getElementById('results').innerHTML = `<div class='alert alert-danger'>Error: ${error.message}</div>`;
  } finally {
    runButton.disabled = false;
    runButton.innerText = 'Run Simulation';
    document.getElementById('progressContainer').style.display = 'none';
  }
});
