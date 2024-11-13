// Function to fetch data from the API and render the pie chart
async function fetchAndRenderSummaryPieChart() {
  try {
      const response = await fetch('http://127.0.0.1:5000/api/check_in_summary_by_time');
      const data = await response.json();
      console.log("API Data:", data);

      if (data.error) {
          console.error("API Error:", data.error);
          return;
      }

      let totalOnTime = 0;
      let totalLate = 0;

      // Calculate total on-time and late counts across all sites
      Object.values(data).forEach(locationData => {
          totalOnTime += locationData.on_time || 0;
          totalLate += locationData.late || 0;
      });

      // Render the pie chart
      var ctx = document.getElementById("myPieChart");
      var myPieChart = new Chart(ctx, {
          type: 'pie',  // Changed to 'pie'
          data: {
              labels: ['On time', 'Late'],
              datasets: [
                  {
                      data: [totalOnTime, totalLate],
                      backgroundColor: ['rgba(78, 115, 223, 1)', 'rgba(231, 74, 59, 1)'],
                      borderColor: ['rgba(78, 115, 223, 1)', 'rgba(231, 74, 59, 1)'],
                      hoverBackgroundColor: ['rgba(78, 115, 223, 0.8)', 'rgba(231, 74, 59, 0.8)'],
                  }
              ]
          },
          options: {
              maintainAspectRatio: false,
              legend: {
                  display: true,
                  position: 'top'
              },
              tooltips: {
                  backgroundColor: "rgb(255,255,255)",
                  bodyFontColor: "#858796",
                  borderColor: '#dddfeb',
                  borderWidth: 1,
                  xPadding: 15,
                  yPadding: 15,
                  displayColors: true,
                  caretPadding: 10
              }
          }
      });
  } catch (error) {
      console.error('Error fetching attendance data:', error);
  }
}

// Run the function on page load
document.addEventListener('DOMContentLoaded', fetchAndRenderSummaryPieChart);
