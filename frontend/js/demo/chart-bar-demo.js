// Initialize Flatpickr for date range selection for the Bar Chart
document.addEventListener('DOMContentLoaded', function() {
    flatpickr("#dateRangePickerBarChart", {
        mode: "range",
        dateFormat: "Y-m-d",
        onChange: function(selectedDates) {
            if (selectedDates.length === 2) {
                const start_date = selectedDates[0].toISOString().split('T')[0];
                const end_date = selectedDates[1].toISOString().split('T')[0];
                console.log("Bar Chart Start Date:", start_date);
                console.log("Bar Chart End Date:", end_date);
                fetchAndRenderBarChart(start_date, end_date);
            }
        }
    });
});

let myBarChart;

// Function to fetch data from the API and render the bar chart
async function fetchAndRenderBarChart(start_date, end_date) {
    try {
        // Construct the API URL with the date range parameters
        const apiUrl = `http://127.0.0.1:5000/api/check_in_summary_by_time_v2?start_date=${start_date}&end_date=${end_date}`;

        // Fetch data from the API
        const response = await fetch(apiUrl);
        const data = await response.json();
        console.log("API Data:", data);

        if (data.error) {
            console.error("API Error:", data.error);
            return;
        }

        const labels = [];
        const onTimeCounts = [];
        const lateCounts = [];

        Object.keys(data).forEach(location => {
            const onTime = data[location].on_time || 0;
            const late = data[location].late || 0;

            // Only add locations with non-zero data
            if (onTime > 0 || late > 0) {
                labels.push(location);
                onTimeCounts.push(onTime);
                lateCounts.push(late);
            }
        });

        // Destroy the previous chart instance if it exists
        if (myBarChart) {
            myBarChart.destroy();
        }

        // Render the new bar chart
        var ctx = document.getElementById("myBarChart");
        myBarChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'On time',
                        backgroundColor: 'rgba(78, 115, 223, 1)',
                        borderColor: 'rgba(78, 115, 223, 1)',
                        data: onTimeCounts
                    },
                    {
                        label: 'Late',
                        backgroundColor: 'rgba(231, 74, 59, 1)',
                        borderColor: 'rgba(231, 74, 59, 1)',
                        data: lateCounts
                    }
                ]
            },
            options: {
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        left: 10,
                        right: 25,
                        top: 25,
                        bottom: 0
                    }
                },
                scales: {
                    x: { // Updated to work with Chart.js v3
                        grid: { display: false, drawBorder: false },
                        ticks: { maxTicksLimit: 6, autoSkip: false, maxRotation: 45, minRotation: 45 }
                    },
                    y: { // Updated to work with Chart.js v3
                        beginAtZero: true,
                        ticks: {
                            maxTicksLimit: 5,
                            padding: 10,
                            // Set the Y-axis max dynamically based on the highest count
                            suggestedMax: Math.max(...onTimeCounts, ...lateCounts) + 5
                        },
                        grid: {
                            color: "rgb(234, 236, 244)",
                            zeroLineColor: "rgb(234, 236, 244)",
                            drawBorder: false,
                            borderDash: [2],
                            zeroLineBorderDash: [2]
                        }
                    }
                },
                plugins: {
                    legend: { display: true },
                    tooltip: {
                        backgroundColor: "rgb(255,255,255)",
                        bodyFontColor: "#858796",
                        titleMarginBottom: 10,
                        titleFontColor: '#6e707e',
                        titleFontSize: 14,
                        borderColor: '#dddfeb',
                        borderWidth: 1,
                        xPadding: 15,
                        yPadding: 15,
                        displayColors: true,
                        caretPadding: 10
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error fetching attendance data:', error);
    }
}

// Call the function with a default date range when the page loads
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1); // First day of the current month
    const endDate = today; // Today's date
    fetchAndRenderBarChart(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
});
