// document.addEventListener('DOMContentLoaded', updateCheckInCount);
document.addEventListener('DOMContentLoaded', function () {
    updateCheckInCount();
});
async function updateCheckInCount() {
    try {
        const response = await fetch('http:///127.0.0.1:5000/api/checkins/onTimeToday');
        const data = await response.json();

        if (response.ok && data.on_time_count !== undefined) {
            const countElement = document.getElementById('onTimeCheckInCount');
            countElement.textContent = `${data.on_time_count} คน`;
        } else {
            console.error("Error: API response is not as expected", data);
        }
    } catch (error) {
        console.error("Error fetching check-in count:", error);
    }
}

