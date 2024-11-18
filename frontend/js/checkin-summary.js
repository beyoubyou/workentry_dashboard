document.addEventListener('DOMContentLoaded', function() {
    fetchCheckInSummary();
});

async function fetchCheckInSummary() {
    try {
        // Fetch data from the backend API
        const response = await fetch('http://127.0.0.1:5000/api/check_in_summary');
        const data = await response.json();

        // Check if the response contains an error
        if (response.ok && !data.error) {
            // Extract the date and count from the API response
            const [latestDate, latestDateCount] = Object.entries(data)[0];

            // Update the card with the check-in count for the latest date
            const checkInCountElement = document.getElementById('checkInSummary');
            if (checkInCountElement) {
                checkInCountElement.textContent = `${latestDateCount} คน`;
            }
        } else {
            console.error('Error: API response is not as expected', data);
        }
    } catch (error) {
        console.error('Error fetching check-in summary:', error);
    }
}
