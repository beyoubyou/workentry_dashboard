document.addEventListener('DOMContentLoaded', function () {
    fetchTotalEmployees();
});

async function fetchTotalEmployees() {
    try {
        // Use the correct URL for your Flask backend
        const response = await fetch('http://127.0.0.1:5000/api/total_employees');
        const data = await response.json();
        if (data.total !== undefined) {
            // Update the HTML with the total count
            document.querySelector('.h5.mb-0.font-weight-bold.text-gray-800').textContent = `${data.total} คน`;
        } else {
            console.error('Error fetching total count:', data.error);
        }
    } catch (error) {
        console.error('Error fetching total employees:', error);
    }
}
