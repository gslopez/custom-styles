// Load Chart.js dynamically
function loadChartJS() {
    return new Promise((resolve, reject) => {
        if (typeof Chart !== 'undefined') {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Custom Chart Helper Functions - Core Library
class CustomChart {
    constructor(canvasId, options = {}) {
        this.canvasId = canvasId;
        this.chart = null;
        this.options = {
            title: 'Chart Title',
            subtitle: 'Chart Description',
            dateFormat: null,
            unit: '',
            showControls: false,
            ...options
        };
        
        this.colors = [
            '#6366f1', '#f97316', '#14b8a6', '#ec4899', '#3b82f6',
            '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'
        ];

        this.createHTML();
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
    }

    createHTML() {
        const body = document.body;
        
        // Create main container
        const container = document.createElement('div');
        container.className = 'custom-chart-container';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'custom-chart-header';
        
        const headerContent = document.createElement('div');
        
        const title = document.createElement('h2');
        title.className = 'custom-chart-title';
        title.textContent = this.options.title;
        
        const subtitle = document.createElement('p');
        subtitle.className = 'custom-chart-subtitle';
        subtitle.textContent = this.options.subtitle;
        
        headerContent.appendChild(title);
        headerContent.appendChild(subtitle);
        header.appendChild(headerContent);
        
        // Create chart area
        const chartDiv = document.createElement('div');
        chartDiv.className = 'custom-chart';
        
        const canvas = document.createElement('canvas');
        canvas.id = this.canvasId;
        
        chartDiv.appendChild(canvas);
        
        // Create legend
        const legend = document.createElement('div');
        legend.className = 'custom-legend';
        legend.id = 'chartLegend';
        
        // Create data table
        const table = document.createElement('table');
        table.className = 'custom-data-table';
        table.id = 'dataTable';
        
        // Assemble everything
        container.appendChild(header);
        container.appendChild(chartDiv);
        container.appendChild(legend);
        container.appendChild(table);
        
        body.appendChild(container);
    }

    parseDate(dateStr) {
        if (/^[A-Za-z]{3}\s\d{1,2}$/.test(dateStr)) {
            const currentYear = new Date().getFullYear();
            return new Date(`${dateStr}, ${currentYear}`);
        }
        return new Date(dateStr);
    }

    formatTooltipDate(dateStr) {
        const date = this.parseDate(dateStr);
        if (isNaN(date.getTime())) {
            return dateStr;
        }
        const options = { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        };
        return date.toLocaleDateString('en-US', options);
    }

    formatValue(value) {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        }
        if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'K';
        }
        return value.toLocaleString();
    }

    createChart(data) {
        document.querySelector('.custom-chart-title').textContent = this.options.title;
        document.querySelector('.custom-chart-subtitle').textContent = this.options.subtitle;

        const datasets = data.datasets.map((dataset, index) => ({
            ...dataset,
            borderColor: dataset.borderColor || this.colors[index % this.colors.length],
            backgroundColor: dataset.backgroundColor || 
                this.hexToRgba(this.colors[index % this.colors.length], 0.1),
            pointBackgroundColor: dataset.pointBackgroundColor || this.colors[index % this.colors.length],
            pointBorderColor: '#ffffff',
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: dataset.borderColor || this.colors[index % this.colors.length]
        }));

        const config = {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                elements: {
                    line: {
                        tension: 0.1,
                        borderWidth: 2
                    },
                    point: {
                        radius: 4,
                        hoverRadius: 6,
                        borderWidth: 2,
                        hoverBorderWidth: 3
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        usePointStyle: true,
                        callbacks: {
                            title: (tooltipItems) => {
                                return this.formatTooltipDate(tooltipItems[0].label);
                            },
                            label: (context) => {
                                const value = context.parsed.y;
                                const formattedValue = this.formatValue(value);
                                const dataset = context.dataset;
                                const unit = dataset.unit || this.options.unit;
                                const unitText = unit ? ` ${unit}` : '';
                                return `${dataset.label}: ${formattedValue}${unitText}`;
                            },
                            afterLabel: (context) => {
                                const currentIndex = context.dataIndex;
                                if (currentIndex > 0) {
                                    const currentValue = context.parsed.y;
                                    const previousValue = context.dataset.data[currentIndex - 1];
                                    const change = ((currentValue - previousValue) / previousValue * 100);
                                    const changeText = change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
                                    return `${changeText} from previous period`;
                                }
                                return '';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: '#f3f4f6',
                            borderColor: '#e5e7eb'
                        },
                        ticks: {
                            color: '#6b7280',
                            font: { size: 12 }
                        }
                    },
                    y: {
                        grid: {
                            color: '#f3f4f6',
                            borderColor: '#e5e7eb'
                        },
                        ticks: {
                            color: '#6b7280',
                            font: { size: 12 },
                            callback: (value) => this.formatValue(value)
                        }
                    }
                }
            }
        };

        this.chart = new Chart(this.ctx, config);
        this.generateLegend(datasets);
        this.generateTable(data);
        this.setupInteractivity();
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    generateLegend(datasets) {
        const legendContainer = document.getElementById('chartLegend');
        legendContainer.innerHTML = '';

        datasets.forEach((dataset, index) => {
            const legendItem = document.createElement('div');
            legendItem.className = 'custom-legend-item';
            legendItem.innerHTML = `
                <div class="custom-legend-checkbox checked"></div>
                <div class="custom-legend-color" style="background-color: ${dataset.borderColor};"></div>
                <span>${dataset.label}</span>
            `;
            legendContainer.appendChild(legendItem);
        });
    }

    generateTable(data) {
        const tableContainer = document.getElementById('dataTable');
        
        let headerHtml = '<thead><tr><th>Date</th>';
        data.datasets.forEach(dataset => {
            headerHtml += `<th>${dataset.label}</th>`;
        });
        headerHtml += '</tr></thead>';

        let bodyHtml = '<tbody>';
        data.labels.forEach((label, index) => {
            bodyHtml += `<tr><td>${label}</td>`;
            data.datasets.forEach(dataset => {
                const value = dataset.data[index];
                bodyHtml += `<td class="metric-cell">${this.formatValue(value)}</td>`;
            });
            bodyHtml += '</tr>';
        });
        bodyHtml += '</tbody>';

        tableContainer.innerHTML = headerHtml + bodyHtml;
    }

    setupInteractivity() {
        // Legend click functionality
        document.querySelectorAll('.custom-legend-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                const checkbox = item.querySelector('.custom-legend-checkbox');
                const isVisible = this.chart.isDatasetVisible(index);
                
                if (isVisible) {
                    this.chart.hide(index);
                    checkbox.classList.remove('checked');
                    item.classList.add('disabled');
                } else {
                    this.chart.show(index);
                    checkbox.classList.add('checked');
                    item.classList.remove('disabled');
                }
            });
        });
    }
}

// Global setup function for easy chart creation
function setupCustomLineChart(options) {
    const config = options.config || {};
    const data = options.data || {};

    // Load Chart.js first, then create chart
    loadChartJS().then(() => {
        // Wait for DOM if not ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                createChart();
            });
        } else {
            createChart();
        }

        function createChart() {
            const chart = new CustomChart('chartCanvas', config);
            chart.createChart(data);
        }
    }).catch((error) => {
        console.error('Failed to load Chart.js:', error);
    });
}
