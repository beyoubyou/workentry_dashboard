document.addEventListener('DOMContentLoaded', function() {
    // Initialize Flatpickr for date range selection for Line Chart
    flatpickr("#dateRangePickerLineChart", {
        mode: "range",
        dateFormat: "Y-m-d",
        onChange: function(selectedDates) {
            if (selectedDates.length === 2) {
                const startDate = selectedDates[0].toISOString().split('T')[0];
                const endDate = selectedDates[1].toISOString().split('T')[0];
                console.log("Line Chart Start Date:", startDate);
                console.log("Line Chart End Date:", endDate);
                fetchAndRenderLineChart(startDate, endDate);
            } else {
                // Call the function with default values when no date range is selected
                fetchAndRenderLineChart();
            }
        }
    });

    // Fetch and render chart on page load with default values
    fetchAndRenderLineChart();
});

let myLineChart;

async function fetchAndRenderLineChart(startDate, endDate) {
    try {
        // If no dates are provided, use a default API URL to get the "total"
        let apiUrl;
        if (startDate && endDate) {
            apiUrl = `http://127.0.0.1:5000/api/check_in_count_by_site_time_v3?start_date=${startDate}&end_date=${endDate}`;
        } else {
            apiUrl = `http://127.0.0.1:5000/api/check_in_count_by_site_time_v3`; // Default to total
        }

        const response = await fetch(apiUrl);
        const data = await response.json();

        console.log('API response data:', data);
        console.log('API URL:', apiUrl);

        if (data.error) {
            console.error(data.error);
            return;
        }

        const timeLabels = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00"];
        const datasets = [];

        Object.keys(data).forEach((site, index) => {
            const siteData = timeLabels.map(label => data[site][label] || 0);
            const colors = [
                { background: "rgba(78, 115, 223, 0.05)", border: "rgba(78, 115, 223, 1)" },
                { background: "rgba(28, 200, 138, 0.05)", border: "rgba(28, 200, 138, 1)" },
                { background: "rgba(255, 193, 7, 0.05)", border: "rgba(255, 193, 7, 1)" }
            ];
            const color = colors[index % colors.length];

            datasets.push({
                label: site,
                tension: 0.3,
                backgroundColor: color.background,
                borderColor: color.border,
                pointRadius: 3,
                pointBackgroundColor: color.border,
                pointBorderColor: color.border,
                pointHoverRadius: 3,
                pointHoverBackgroundColor: color.border,
                pointHoverBorderColor: color.border,
                pointHitRadius: 10,
                pointBorderWidth: 2,
                data: siteData
            });
        });

        if (myLineChart) {
            myLineChart.destroy();
        }

        const ctx = document.getElementById("myAreaChart");
        myLineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timeLabels,
                datasets: datasets
            },
            options: {
                maintainAspectRatio: false,
                layout: {
                    padding: { left: 10, right: 25, top: 25, bottom: 0 }
                },
                scales: {
                    x: {
                        type: 'category',
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            autoSkip: false,
                            maxRotation: 0,
                            minRotation: 0
                        }
                    },
                    y: {
                        beginAtZero: true,
                        maxTicksLimit: 5,
                        ticks: {
                            padding: 10
                        },
                        grid: {
                            color: "rgb(234, 236, 244)",
                            drawBorder: false,
                            borderDash: [2],
                            zeroLineBorderDash: [2]
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        backgroundColor: "rgb(255,255,255)",
                        bodyColor: "#858796",
                        titleMarginBottom: 10,
                        titleColor: '#6e707e',
                        titleFont: { size: 14 },
                        borderColor: '#dddfeb',
                        borderWidth: 1,
                        padding: 15,
                        displayColors: false,
                        intersect: false,
                        mode: 'index',
                        caretPadding: 10,
                        callbacks: {
                            label: function(tooltipItem) {
                                var datasetLabel = tooltipItem.dataset.label || '';
                                return datasetLabel + ': ' + number_format(tooltipItem.raw);
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error fetching attendance data:', error);
    }
}
