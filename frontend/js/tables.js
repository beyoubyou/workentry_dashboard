document.addEventListener('DOMContentLoaded', function () {
    fetchEmployeeData();
});

async function fetchEmployeeData() {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/employees_with_site');
        const data = await response.json();

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
                    <td><a href="#" class="employee-name" data-id="${employee.emp_corp_id}">${employee.full_name_th}</a></td>
                    <td>${employee.full_name_en || 'N/A'}</td>
                    <td>${employee.email || 'N/A'}</td>
                    <td>${employee.location_name || 'N/A'}</td>
                </tr>
            `;
            dataTableBody.insertAdjacentHTML('beforeend', row);
        });

        // Initialize DataTable
        $('#dataTable').DataTable();

        // Add click event listeners to employee names
        document.querySelectorAll('.employee-name').forEach(element => {
            element.addEventListener('click', function (event) {
                event.preventDefault();
                const employeeId = this.getAttribute('data-id');
                showEmployeeDetails(employeeId);
            });
        });
    } catch (error) {
        console.error('Error fetching employee data:', error);
    }
}

async function showEmployeeDetails(employeeId) {
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/employee_checkins?emp_id=${employeeId}`);
        const checkInData = await response.json();

        console.log(checkInData);

        if (checkInData.error) {
            console.error(checkInData.error);
            return;
        }

        const employee = checkInData.find(emp => emp.emp_corp_id === employeeId);
        if (!employee) {
            console.error("Employee not found");
            return;
        }

        document.getElementById('modalName').textContent = employee.full_name_th;
        document.getElementById('modalNameEN').textContent = employee.full_name_en;
        document.getElementById('modalEmail').textContent = employee.email;
        document.getElementById('modalLocation').textContent = employee.location_name;

        // Check if 'check_ins' exists and is an array
        if (!employee.check_ins || !Array.isArray(employee.check_ins)) {
            console.warn("No check-in records available for this employee");
            $('#employeeModal').modal('show');
            return;
        }

        // Extract check-in dates and times for the line chart
        const dates = employee.check_ins.map(record => record.date);
        const times = employee.check_ins.map(record => {
            const [hour, minute] = record.time.split(':').map(Number);
            return hour + minute / 60; // Convert time to decimal for plotting
        });

        // Clear any existing chart instance
        const chartCanvas = document.getElementById('employeeChart');
        if (chartCanvas.chartInstance) {
            chartCanvas.chartInstance.destroy();
        }

        // Create the line chart with formatted y-axis labels
        const ctx = chartCanvas.getContext('2d');
        chartCanvas.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Check-In Time',
                    data: times,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgb(54, 162, 235)',
                    fill: false
                }]
            },
            options: {
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Time'
                        },
                        min: 0,
                        max: 24,
                        ticks: {
                            stepSize: 1, // Set a step size to create clear hour intervals
                            callback: function (value) {
                                const hour = Math.floor(value);
                                const minute = Math.round((value % 1) * 60);
                                return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                            }
                        }
                    }
                }
            }
        });

        // Show the modal
        $('#employeeModal').modal('show');
    } catch (error) {
        console.error('Error fetching check-in data:', error);
    }
}
