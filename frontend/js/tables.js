document.addEventListener('DOMContentLoaded', function() {
    fetchEmployeeData();
});

async function fetchEmployeeData() {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/employees_with_site');
        const data = await response.json();

        // Check if there's an error
        if (data.error) {
            console.error(data.error);
            return;
        }

        // Populate the DataTable
        const dataTableBody = document.querySelector('#dataTable tbody');
        dataTableBody.innerHTML = ""; // Clear existing rows

        data.forEach(employee => {
            const row = `
                <tr>
                    <td><a href="#" class="employee-name" data-id="${employee.id}">${employee.full_name_th}</a></td>
                    <td>${employee.full_name_en}</td>
                    <td>${employee.email}</td>
                    <td>${employee.location_name}</td>
                </tr>
            `;
            dataTableBody.insertAdjacentHTML('beforeend', row);
        });

        // Initialize DataTable
        $('#dataTable').DataTable();

        // Add click event listeners to employee names
        document.querySelectorAll('.employee-name').forEach(element => {
            element.addEventListener('click', async function(event) {
                event.preventDefault();
                const employeeId = this.getAttribute('data-id');
                fetchEmployeeDetails(employeeId);
            });
        });
    } catch (error) {
        console.error('Error fetching employee data:', error);
    }
}

async function fetchEmployeeDetails(employeeId) {
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/employee/${employeeId}`);
        const userInfo = await response.json();

        if (userInfo.error) {
            console.error(userInfo.error);
            return;
        }

        // Display the user information in a modal or another way
        alert(`Name: ${userInfo.full_name_th}\nEmail: ${userInfo.email}\nLocation: ${userInfo.location_name}\nMore details: ${userInfo.details || 'N/A'}`);
    } catch (error) {
        console.error('Error fetching employee details:', error);
    }
}
