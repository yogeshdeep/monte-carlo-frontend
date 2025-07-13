document.getElementById('runButton').addEventListener('click', async () => {
  const apiUrl = 'https://monte-carlo-api.onrender.com';  // replace with your actual Render backend URL

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

  document.getElementById('results').innerHTML = "<p class='text-info'>Running simulation... please wait.</p>";

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.status !== "success") {
      document.getElementById('results').innerHTML = `<div class='alert alert-danger'>Error: ${data.message}</div>`;
      return;
    }

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
    console.error(error);
    document.getElementById('results').innerHTML = `<div class='alert alert-danger'>Error: ${error.message}</div>`;
  }
});
