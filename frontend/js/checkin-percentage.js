document.addEventListener('DOMContentLoaded', function () {
    updateCheckInData();
});

async function updateCheckInData() {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/check_in_percentage');
        const data = await response.json();

        if (response.ok && data.on_time_percentage !== undefined && data.total_checkin !== undefined) {
            // Update the on-time percentage
            const percentageElement = document.getElementById('onTimePercentage');
            percentageElement.textContent = `${data.on_time_percentage}%`; // Display the percentage

            // Update the progress bar
            const progressBar = document.getElementById('progressBar');
            progressBar.style.width = `${data.on_time_percentage}%`; // Set the width of the progress bar
            progressBar.setAttribute('aria-valuenow', data.on_time_percentage); // Update the aria-valuenow attribute

            // Update the total check-in count
            const totalCheckInElement = document.getElementById('totalCheckIn');
            totalCheckInElement.textContent = `${data.total_checkin} คน`; // Display the total check-in count
        } else {
            console.error("Error: API response is not as expected", data);
        }
    } catch (error) {
        console.error("Error fetching check-in data:", error);
    }
}
