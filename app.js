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

    estimate.textContent = `Working... estimated time ~10s`;

    const startTime = Date.now();
    const interval = 100;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / durationMs) * 100, 100);
      bar.style.width = `${progress.toFixed(0)}%`;
      bar.setAttribute('aria-valuenow', progress.toFixed(0));
      bar.textContent = `${progress.toFixed(0)}%`;

      if (progress >= 100) {
        clearInterval(timer);
        resolve();
      }
    }, interval);
  });
}

document.getElementById('runButton').addEventListener('click', async () => {
  const runButton = document.getElementById('runButton');
  runButton.disabled = true;
  runButton.innerText = 'Running...';

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

  document.getElementById('results').innerHTML = "";
  document.getElementById('chartsContainer').innerHTML = "";

  const formData = new FormData();
  formData.append('history_years', history_years);
  formData.append('drift_adjust', drift_adjust);
  formData.append('simulation_horizons', JSON.stringify(horizons));
  formData.append('index_symbol', index_symbol);
  formData.append('simulation_type', simulation_type);
  formData.append('rebased', rebased);
  formData.append('num_simulations', num_simulations);

  const fileInput = document.getElementById('portfolio_file');
  if (fileInput.files.length > 0) {
    formData.append('portfolio_file', fileInput.files[0]);
  }

  const progressPromise = simulateProgressBar(10000);

  try {
    const fetchPromise = fetch(apiUrl, {
      method: 'POST',
      body: formData
    });

    const [res] = await Promise.all([fetchPromise, progressPromise]);
    const data = await res.json();

    if (data.status !== "success") {
      document.getElementById('results').innerHTML = `<div class='alert alert-danger'>Error: ${data.message}</div>`;
      return;
    }

    document.getElementById('progressContainer').style.display = 'none';

    // ================================
    // ⭐️ Fixed summary table with horizon headers
    // ================================
    const summary = data.summary_data;
    const metrics = summary['Metric'];
    const explanations = summary['Explanation'];

    const horizonKeys = Object.keys(summary)
                              .filter(k => !["Metric", "Explanation"].includes(k))
                              .sort((a, b) => parseInt(a) - parseInt(b));

    let html = `<h3>Summary Data</h3><table class='table table-bordered'><thead><tr>
<th>Metric</th><th>Explanation</th>`;

    horizonKeys.forEach(h => {
      html += `<th>${h}-Year</th>`;
    });
    html += `</tr></thead><tbody>`;

    for (let i = 0; i < metrics.length; i++) {
      html += `<tr><th>${metrics[i]}</th><td>${explanations[i]}</td>`;
      horizonKeys.forEach(h => {
        html += `<td>${summary[h][i]}</td>`;
      });
      html += `</tr>`;
    }
    html += `</tbody></table>`;
    document.getElementById('results').innerHTML = html;

    // ================================
    // ⭐️ Improved Multiple Charts Rendering
    // ================================
    const chartsContainer = document.getElementById('chartsContainer');
    chartsContainer.innerHTML = '';

    for (const horizon in data.histogram_samples) {
      const samples = data.histogram_samples[horizon];

      const binCount = 20;
      const min = Math.min(...samples);
      const max = Math.max(...samples);
      const binWidth = (max - min) / binCount;
      const bins = new Array(binCount).fill(0);

      samples.forEach(val => {
        const idx = Math.min(Math.floor((val - min) / binWidth), binCount - 1);
        bins[idx]++;
      });

      const labels = bins.map((_, i) => (min + i * binWidth).toFixed(0));

      // ⭐️ Create a nice responsive wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'chart-wrapper mb-4';
      wrapper.style.width = '100%';
      wrapper.style.maxWidth = '1000px';
      wrapper.style.margin = '30px auto';

      const title = document.createElement('h4');
      title.innerText = `${horizon}-Year Simulation Histogram`;
      title.className = 'text-center my-3';

      const canvas = document.createElement('canvas');
      canvas.id = `chart_${horizon}`;
      canvas.style.width = '100%';
      canvas.style.height = '400px';
      canvas.style.display = 'block';

      wrapper.appendChild(title);
      wrapper.appendChild(canvas);
      chartsContainer.appendChild(wrapper);

      const ctx = canvas.getContext('2d');

      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: `Frequency for ${horizon}-Year Horizon`,
            data: bins,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: `Simulation Result Histogram - ${horizon}-Year`
            }
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Portfolio Value'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Frequency'
              }
            }
          }
        }
      });
    }

  } catch (error) {
    document.getElementById('results').innerHTML = `<div class='alert alert-danger'>Error: ${error.message}</div>`;
  } finally {
    runButton.disabled = false;
    runButton.innerText = 'Run Simulation';
    document.getElementById('progressContainer').style.display = 'none';
  }
});
