// Global variables
let nxLogData = [];
let queryLogData = [];
let charts = {};
let filterKeywords = [];

// DOM elements
const nxLogInput = document.getElementById("nxLog");
const queryLogInput = document.getElementById("queryLog");
const nxFileName = document.getElementById("nxFileName");
const queryFileName = document.getElementById("queryFileName");
const analyzeBtn = document.getElementById("analyzeBtn");
const statsSection = document.getElementById("statsSection");
const chartsSection = document.getElementById("chartsSection");
const filterInput = document.getElementById("filterInput");
const addFilterBtn = document.getElementById("addFilterBtn");
const filterTags = document.getElementById("filterTags");

// File input handlers
nxLogInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    nxFileName.textContent = file.name;
    nxFileName.classList.add("selected");
    readLogFile(file, "nx");
  }
  checkAnalyzeButton();
});

queryLogInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    queryFileName.textContent = file.name;
    queryFileName.classList.add("selected");
    readLogFile(file, "query");
  }
  checkAnalyzeButton();
});

// Check if analyze button should be enabled
function checkAnalyzeButton() {
  if (nxLogData.length > 0 || queryLogData.length > 0) {
    analyzeBtn.disabled = false;
  }
}

// Read log file
function readLogFile(file, type) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    const lines = content.split("\n").filter((line) => line.trim());

    if (type === "nx") {
      nxLogData = parseNxLog(lines);
    } else {
      queryLogData = parseQueryLog(lines);
    }
  };
  reader.readAsText(file);
}

// Parse nx.log (failed queries)
function parseNxLog(lines) {
  return lines
    .map((line) => {
      const match = line.match(/\[([\d\-: ]+)\]\s+([\d\.]+)\s+([\S]+)\s+(\w+)/);
      if (match) {
        return {
          timestamp: new Date(match[1]),
          ip: match[2],
          domain: match[3],
          type: match[4],
          status: "failed",
        };
      }
      return null;
    })
    .filter((item) => item !== null);
}

// Parse query.log (successful queries)
function parseQueryLog(lines) {
  return lines
    .map((line) => {
      const match = line.match(
        /\[([\d\-: ]+)\]\s+([\d\.]+)\s+([\S]+)\s+(\w+)\s+(\w+)\s+([\dms]+)\s+([\S]+)/
      );
      if (match) {
        return {
          timestamp: new Date(match[1]),
          ip: match[2],
          domain: match[3],
          type: match[4],
          result: match[5],
          responseTime: match[6],
          server: match[7],
          status: "success",
        };
      }
      return null;
    })
    .filter((item) => item !== null);
}

// Analyze button handler
analyzeBtn.addEventListener("click", () => {
  filterKeywords = [];
  updateFilterTags();
  analyzeData();
});

// Add filter button handler
addFilterBtn.addEventListener("click", () => {
  addFilter();
});

// Filter input enter key handler
filterInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    addFilter();
  }
});

// Add filter function
function addFilter() {
  const keyword = filterInput.value.trim();
  if (keyword && !filterKeywords.includes(keyword)) {
    filterKeywords.push(keyword);
    filterInput.value = "";
    updateFilterTags();
    analyzeData();
  }
}

// Remove filter function
function removeFilter(keyword) {
  filterKeywords = filterKeywords.filter((k) => k !== keyword);
  updateFilterTags();
  analyzeData();
}

// Update filter tags display
function updateFilterTags() {
  filterTags.innerHTML = "";
  filterKeywords.forEach((keyword) => {
    const tag = document.createElement("div");
    tag.className = "filter-tag";
    tag.innerHTML = `
            <span class="filter-tag-text">${keyword}</span>
            <button class="remove-filter-btn" onclick="removeFilter('${keyword}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;
    filterTags.appendChild(tag);
  });
}

// Main analysis function
function analyzeData() {
  const allData = [...nxLogData, ...queryLogData];

  if (allData.length === 0) {
    alert("请先上传日志文件！");
    return;
  }

  // Show sections
  statsSection.classList.remove("hidden");
  chartsSection.classList.remove("hidden");

  // Update statistics
  updateStats();

  // Create charts
  createTopDomainsChart();
  createQueryTypeChart();
  createTopFailedChart();
  createTimeDistributionChart();
  createServerChart();

  // Smooth scroll to stats
  statsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Update statistics cards
function updateStats() {
  // Apply filters to data
  let filteredSuccessData = [...queryLogData];
  let filteredFailData = [...nxLogData];

  if (filterKeywords.length > 0) {
    filteredSuccessData = filteredSuccessData.filter((item) => {
      return !filterKeywords.some((keyword) => item.domain.includes(keyword));
    });
    filteredFailData = filteredFailData.filter((item) => {
      return !filterKeywords.some((keyword) => item.domain.includes(keyword));
    });
  }

  const successCount = filteredSuccessData.length;
  const failCount = filteredFailData.length;
  const totalCount = successCount + failCount;
  const successRate =
    totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) : 0;

  document.getElementById("successCount").textContent =
    successCount.toLocaleString();
  document.getElementById("failCount").textContent = failCount.toLocaleString();
  document.getElementById("totalCount").textContent =
    totalCount.toLocaleString();
  document.getElementById("successRate").textContent = successRate + "%";

  // Animate numbers
  animateValue("successCount", 0, successCount, 1000);
  animateValue("failCount", 0, failCount, 1000);
  animateValue("totalCount", 0, totalCount, 1000);
}

// Animate number counting
function animateValue(id, start, end, duration) {
  const element = document.getElementById(id);
  const range = end - start;
  const increment = range / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if (current >= end) {
      element.textContent = end.toLocaleString();
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(current).toLocaleString();
    }
  }, 16);
}

// Create Top 20 Domains Chart
function createTopDomainsChart() {
  let allData = [...nxLogData, ...queryLogData];

  // Apply filters if set
  if (filterKeywords.length > 0) {
    allData = allData.filter((item) => {
      return !filterKeywords.some((keyword) => item.domain.includes(keyword));
    });
  }

  const domainCount = {};

  allData.forEach((item) => {
    domainCount[item.domain] = (domainCount[item.domain] || 0) + 1;
  });

  const sortedDomains = Object.entries(domainCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  const ctx = document.getElementById("topDomainsChart");
  if (charts.topDomains) charts.topDomains.destroy();

  charts.topDomains = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sortedDomains.map((d) => `${d[0]} (${d[1]})`),
      datasets: [
        {
          label: "查询次数",
          data: sortedDomains.map((d) => d[1]),
          backgroundColor: "rgba(99, 102, 241, 0.8)",
          borderColor: "rgba(99, 102, 241, 1)",
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(17, 24, 39, 0.95)",
          padding: 12,
          titleColor: "#f1f5f9",
          bodyColor: "#f1f5f9",
          borderColor: "#334155",
          borderWidth: 1,
          cornerRadius: 8,
          callbacks: {
            afterBody: () => {
              return "\n可拖动选择文字复制";
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(51, 65, 85, 0.3)",
          },
          ticks: {
            color: "#94a3b8",
          },
        },
        y: {
          grid: {
            display: false,
          },
          ticks: {
            color: "#94a3b8",
            font: {
              size: 11,
            },
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0,
          },
        },
      },
    },
  });
}

// Create Query Type Distribution Chart
function createQueryTypeChart() {
  let allData = [...nxLogData, ...queryLogData];

  // Apply filters if set
  if (filterKeywords.length > 0) {
    allData = allData.filter((item) => {
      return !filterKeywords.some((keyword) => item.domain.includes(keyword));
    });
  }

  const typeCount = {};

  allData.forEach((item) => {
    typeCount[item.type] = (typeCount[item.type] || 0) + 1;
  });

  const ctx = document.getElementById("queryTypeChart");
  if (charts.queryType) charts.queryType.destroy();

  const colors = [
    "rgba(99, 102, 241, 0.8)",
    "rgba(139, 92, 246, 0.8)",
    "rgba(16, 185, 129, 0.8)",
    "rgba(245, 158, 11, 0.8)",
    "rgba(239, 68, 68, 0.8)",
    "rgba(59, 130, 246, 0.8)",
  ];

  const total = Object.values(typeCount).reduce((a, b) => a + b, 0);

  charts.queryType = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(typeCount),
      datasets: [
        {
          data: Object.values(typeCount),
          backgroundColor: colors,
          borderColor: "#1e293b",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false, // Hide default legend, use custom HTML legend
        },
        tooltip: {
          backgroundColor: "rgba(17, 24, 39, 0.95)",
          padding: 12,
          titleColor: "#f1f5f9",
          bodyColor: "#f1f5f9",
          borderColor: "#334155",
          borderWidth: 1,
          cornerRadius: 8,
          callbacks: {
            label: (context) => {
              const label = context.label || "";
              const value = context.parsed;
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            },
          },
        },
      },
    },
  });

  // Create custom HTML legend
  createCustomLegend(
    Object.keys(typeCount),
    colors,
    total,
    typeCount,
    charts.queryType
  );
}

// Create custom HTML legend for query type chart
function createCustomLegend(labels, colors, total, typeCount, chart) {
  const legendContainer = document.getElementById("queryTypeLegend");
  legendContainer.innerHTML = "";

  labels.forEach((label, index) => {
    const value = typeCount[label];
    const percentage = ((value / total) * 100).toFixed(1);

    const legendItem = document.createElement("div");
    legendItem.className = "legend-item";
    legendItem.dataset.index = index;

    const colorBox = document.createElement("div");
    colorBox.className = "legend-color";
    colorBox.style.backgroundColor = colors[index];

    const text = document.createElement("span");
    text.className = "legend-text";
    text.textContent = `${label}: ${percentage}%`;

    legendItem.appendChild(colorBox);
    legendItem.appendChild(text);

    legendItem.addEventListener("click", () => {
      const meta = chart.getDatasetMeta(0);
      meta.data[index].hidden = !meta.data[index].hidden;

      // Toggle legend-hidden class for strikethrough
      legendItem.classList.toggle("legend-hidden");

      chart.update();
    });

    legendContainer.appendChild(legendItem);
  });
}

// Create Top 20 Failed Domains Chart
function createTopFailedChart() {
  let filteredFailData = [...nxLogData];

  // Apply filters if set
  if (filterKeywords.length > 0) {
    filteredFailData = filteredFailData.filter((item) => {
      return !filterKeywords.some((keyword) => item.domain.includes(keyword));
    });
  }

  const failedDomainCount = {};

  filteredFailData.forEach((item) => {
    failedDomainCount[item.domain] = (failedDomainCount[item.domain] || 0) + 1;
  });

  const sortedFailedDomains = Object.entries(failedDomainCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  const ctx = document.getElementById("topFailedChart");
  if (charts.topFailed) charts.topFailed.destroy();

  charts.topFailed = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sortedFailedDomains.map((d) => d[0]),
      datasets: [
        {
          label: "失败次数",
          data: sortedFailedDomains.map((d) => d[1]),
          backgroundColor: "rgba(239, 68, 68, 0.8)",
          borderColor: "rgba(239, 68, 68, 1)",
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const domain = sortedFailedDomains[index][0];
          // Copy domain to clipboard
          navigator.clipboard.writeText(domain).then(() => {
            // Show a brief notification
            const notification = document.createElement("div");
            notification.textContent = "已复制: " + domain;
            notification.style.cssText = `
                            position: fixed;
                            top: 20px;
                            right: 20px;
                            background: rgba(239, 68, 68, 0.9);
                            color: white;
                            padding: 1rem 1.5rem;
                            border-radius: 0.5rem;
                            font-size: 0.9rem;
                            z-index: 10000;
                            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                        `;
            document.body.appendChild(notification);
            setTimeout(() => {
              notification.style.transition = "opacity 0.3s ease";
              notification.style.opacity = "0";
              setTimeout(() => notification.remove(), 300);
            }, 2000);
          });
        }
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(17, 24, 39, 0.95)",
          padding: 12,
          titleColor: "#f1f5f9",
          bodyColor: "#f1f5f9",
          borderColor: "#334155",
          borderWidth: 1,
          cornerRadius: 8,
          callbacks: {
            afterBody: () => {
              return "\n点击复制域名";
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(51, 65, 85, 0.3)",
          },
          ticks: {
            color: "#94a3b8",
          },
        },
        y: {
          grid: {
            display: false,
          },
          ticks: {
            color: "#94a3b8",
            font: {
              size: 11,
            },
          },
        },
      },
    },
  });
}

// Create Time Distribution Chart
function createTimeDistributionChart() {
  let allData = [...nxLogData, ...queryLogData];

  // Apply filters if set
  if (filterKeywords.length > 0) {
    allData = allData.filter((item) => {
      return !filterKeywords.some((keyword) => item.domain.includes(keyword));
    });
  }

  const hourCount = new Array(24).fill(0);

  allData.forEach((item) => {
    const hour = item.timestamp.getHours();
    hourCount[hour]++;
  });

  const ctx = document.getElementById("timeDistChart");
  if (charts.timeDist) charts.timeDist.destroy();

  charts.timeDist = new Chart(ctx, {
    type: "line",
    data: {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [
        {
          label: "查询次数",
          data: hourCount,
          borderColor: "rgba(99, 102, 241, 1)",
          backgroundColor: "rgba(99, 102, 241, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "rgba(99, 102, 241, 1)",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(17, 24, 39, 0.95)",
          padding: 12,
          titleColor: "#f1f5f9",
          bodyColor: "#f1f5f9",
          borderColor: "#334155",
          borderWidth: 1,
          cornerRadius: 8,
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(51, 65, 85, 0.3)",
          },
          ticks: {
            color: "#94a3b8",
          },
        },
        y: {
          grid: {
            color: "rgba(51, 65, 85, 0.3)",
          },
          ticks: {
            color: "#94a3b8",
          },
        },
      },
    },
  });
}

// Create Top 10 DNS Servers Chart
function createServerChart() {
  let filteredSuccessData = [...queryLogData];

  // Apply filters if set
  if (filterKeywords.length > 0) {
    filteredSuccessData = filteredSuccessData.filter((item) => {
      return !filterKeywords.some((keyword) => item.domain.includes(keyword));
    });
  }

  const serverCount = {};

  filteredSuccessData.forEach((item) => {
    if (item.server && item.server !== "-") {
      serverCount[item.server] = (serverCount[item.server] || 0) + 1;
    }
  });

  const sortedServers = Object.entries(serverCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const ctx = document.getElementById("serverChart");
  if (charts.server) charts.server.destroy();

  charts.server = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sortedServers.map((s) => s[0]),
      datasets: [
        {
          label: "使用次数",
          data: sortedServers.map((s) => s[1]),
          backgroundColor: "rgba(139, 92, 246, 0.8)",
          borderColor: "rgba(139, 92, 246, 1)",
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(17, 24, 39, 0.95)",
          padding: 12,
          titleColor: "#f1f5f9",
          bodyColor: "#f1f5f9",
          borderColor: "#334155",
          borderWidth: 1,
          cornerRadius: 8,
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: "#94a3b8",
            maxRotation: 45,
            minRotation: 45,
            font: {
              size: 10,
            },
          },
        },
        y: {
          grid: {
            color: "rgba(51, 65, 85, 0.3)",
          },
          ticks: {
            color: "#94a3b8",
          },
        },
      },
    },
  });
}
