const apiBaseUrl = 'https://monte-carlo-api.onrender.com';
const startUrl = `${apiBaseUrl}/start_simulation`;
const progressUrl = `${apiBaseUrl}/progress_stream`;

document.getElementById('runButton').addEventListener('click', async () => {
  const runButton = document.getElementById('runButton');
  runButton.disabled = true;
  runButton.innerText = 'Running...';

  document.getElementById('results').innerHTML = "";
  document.getElementById('chartsContainer').innerHTML = "";

  // Show progress bar
  const container = document.getElementById('progressContainer');
  const bar = document.getElementById('progressBar');
  const estimate = document.getElementById('progressEstimate');
  container.style.display = 'block';
  bar.style.width = '0%';
  bar.textContent = '0%';
  estimate.textContent = '';

  // Prepare form data
  const formData = new FormData();
  formData.append('history_years', parseInt(document.getElementById('history_years').value));
  formData.append('drift_adjust', parseFloat(document.getElementById('drift_adjust').value) / 100);
  formData.append('simulation_horizons', JSON.stringify(
    document.getElementById('simulation_horizons').value
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n))
  ));
  formData.append('index_symbol', document.getElementById('index_symbol').value.trim().toUpperCase());
  formData.append('simulation_type', document.getElementById('simulation_type').value);
  formData.append('rebased', document.getElementById('rebased').checked);
  formData.append('num_simulations', parseInt(document.getElementById('num_simulations').value));

  const fileInput = document.getElementById('portfolio_file');
  if (fileInput.files.length > 0) {
    formData.append('portfolio_file', fileInput.files[0]);
  }

  try {
    // 1️⃣ Start simulation
    await fetch(startUrl, {
      method: 'POST',
      body: formData
    });

    // 2️⃣ Listen to progress
    const eventSource = new EventSource(progressUrl);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Update progress bar
      bar.style.width = `${data.progress}%`;
      bar.textContent = `${data.progress}%`;
      estimate.textContent = data.message;

      if (data.done) {
        eventSource.close();
        container.style.display = 'none';
        runButton.disabled = false;
        runButton.innerText = 'Run Simulation';

        if (data.result.status === "success") {
          renderResults(data.result);
        } else {
          document.getElementById('results').innerHTML = `<div class='alert alert-danger'>Error: ${data.result.message}</div>`;
        }
      }
    };

  } catch (error) {
    document.getElementById('results').innerHTML = `<div class='alert alert-danger'>Error: ${error.message}</div>`;
    runButton.disabled = false;
    runButton.innerText = 'Run Simulation';
    container.style.display = 'none';
  }
});

function renderResults(result) {
  // ================================
  // ⭐️ Build summary table with horizon headers
  // ================================
  const summary = result.summary_data;
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
  // ⭐️ Render Histograms
  // ================================
  const chartsContainer = document.getElementById('chartsContainer');
  chartsContainer.innerHTML = '';

  for (const horizon in result.histogram_samples) {
    const samples = result.histogram_samples[horizon];

    // Create histogram bins
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

    // Card-like wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'chart-wrapper mb-5 p-3 border rounded shadow-sm bg-white';
    wrapper.style.width = '100%';
    wrapper.style.maxWidth = '900px';
    wrapper.style.margin = '40px auto';

    const title = document.createElement('h4');
    title.innerText = `${horizon}-Year Simulation Histogram`;
    title.className = 'text-center mb-3';
    wrapper.appendChild(title);

    const canvasContainer = document.createElement('div');
    canvasContainer.style.position = 'relative';
    canvasContainer.style.height = '300px';  // Taller for better readability
    canvasContainer.style.width = '100%';

    const canvas = document.createElement('canvas');
    canvas.id = `chart_${horizon}`;
    canvas.style.display = 'block';
    canvasContainer.appendChild(canvas);
    wrapper.appendChild(canvasContainer);
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
          },
          legend: {
            display: false
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
            },
            beginAtZero: true
          }
        }
      }
    });
  }
}
