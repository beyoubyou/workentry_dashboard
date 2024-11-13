from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from haversine import haversine, Unit
import os
from datetime import datetime, timedelta
import pytz
from geopy.distance import geodesic

# import logging
# # Configure logging for debugging
# logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:8888"}})

# MongoDB setup
MONGO_URI = os.getenv("MONGO_URI", "mongodb://faceverify:faceverify1234@13.251.157.178:27017")
client = MongoClient(MONGO_URI)
db = client["face_verification"]

employee_collection = db["employee"]
corp_site_collection = db["corp_site"]
check_in_collection = db["check_in"]

#get total employees
@app.route('/api/total_employees', methods=['GET'])
def get_total_employees():
    try:
        total_count = employee_collection.count_documents({})
        return jsonify({"total": total_count})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# employee with site location name
@app.route('/api/employees_with_site', methods=['GET'])
def get_employees_with_site():
    try:
        employees = employee_collection.find()
        result = []

        for employee in employees:
            # Fetch site_id and map it with location name
            site_id = employee.get("site_id")

            # Ensure site_id is converted to ObjectId for the query
            site = corp_site_collection.find_one({"_id": ObjectId(site_id)}) if site_id else None
            location_name = site["location_name"] if site else "Unknown"

            # Combine fname_th and lname_th into a single full name
            full_name_th = f"{employee.get('fname_th', '')} {employee.get('lname_th', '')}"

            # Combine fname_en and lname_en into a single full name
            full_name_en = f"{employee.get('fname_en', '')} {employee.get('lname_en', '')}"

            # Append employee data with mapped location name
            result.append({
                "full_name_th": full_name_th,
                "full_name_en": full_name_en,
                "email": employee.get("email", ""),
                "location_name": location_name
            })

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# employee attendance
@app.route('/api/check_in_records', methods=['GET'])
def get_check_in_records():
    try:
        # Fetch all check-in records from the collection
        check_in_records = check_in_collection.find()

        # Prepare data for response
        response_data = []

        for record in check_in_records:
            timestamp = record.get("timestamp")
            if timestamp:
                # Convert timestamp to a datetime object
                timestamp = datetime.fromisoformat(timestamp[:-1])  # Remove the 'Z' if it's present
                response_data.append({
                    "timestamp": timestamp.isoformat(),
                    "location_name": record.get("location_name", "Unknown")
                })

        return jsonify(response_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/check_in_count_by_site', methods=['GET'])
def check_in_count_by_site():
    corp_sites = list(corp_site_collection.find())
    site_check_in_count = {site["location_name"]: 0 for site in corp_sites}

    for check_in in check_in_collection.find():
        check_in_lat = check_in.get("current_lat")
        check_in_long = check_in.get("current_long")
        
        closest_site_name = None
        closest_distance = float('inf')
        
        # Find the closest corp_site within 1 km
        for site in corp_sites:
            site_lat = site["lat"]
            site_long = site["long"]
            
            # Calculate distance using haversine
            distance = haversine((check_in_lat, check_in_long), (site_lat, site_long), unit=Unit.KILOMETERS)
            
            # Log each distance check
            # logging.debug(f"Check-in at ({check_in_lat}, {check_in_long}) to Site '{site['location_name']}' "
                        #   f"at ({site_lat}, {site_long}): {distance:.2f} km")

            # Check if this site is the closest so far and within 1 km
            if distance < closest_distance and distance <= 1.0:
                closest_site_name = site["location_name"]
                closest_distance = distance

        # If we found a close enough site, count this check-in for that site only
        if closest_site_name:
            site_check_in_count[closest_site_name] += 1
            # logging.debug(f"Check-in at ({check_in_lat}, {check_in_long}) counted for '{closest_site_name}'")

    # Convert the count dictionary to a list of dictionaries for JSON output
    result = [{"location_name": name, "check_in_count": count} for name, count in site_check_in_count.items()]
    return jsonify(result)



# count check-ins by site and time
@app.route('/api/check_in_count_by_site_time', methods=['GET'])
def check_in_count_by_site_time():
    try:
        # Define time range labels (hourly in local time, assumed UTC+7)
        time_ranges = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00"]
        result = {time: [] for time in time_ranges}

        # Fetch all sites
        sites = list(corp_site_collection.find({}))

        # Process each site and its check-in records
        for site in sites:
            site_name = site.get("location_name", "Unknown")
            try:
                site_lat = float(site["lat"])  # Convert latitude to float
                site_long = float(site["long"])  # Convert longitude to float
            except ValueError:
                # Skip sites with invalid latitude or longitude
                continue

            # Initialize counts for each time range
            time_counts = {time: 0 for time in time_ranges}

            # Fetch check-ins near the site
            check_ins = check_in_collection.find({
                "current_lat": {"$gte": site_lat - 0.01, "$lte": site_lat + 0.01},
                "current_long": {"$gte": site_long - 0.01, "$lte": site_long + 0.01}
            })

            # Count check-ins in each time range
            for check_in in check_ins:
                timestamp = check_in.get("timestamp", "")
                
                try:
                    # Convert timestamp to UTC time and then add 7 hours for UTC+7
                    utc_time = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                    local_time = utc_time + timedelta(hours=7)  # Add 7 hours to convert to UTC+7
                    check_in_hour = local_time.strftime("%H:00")

                    # Log the adjusted timestamp for debugging
                    print(f"Adjusted Local Time (UTC+7): {local_time}")
                    
                    # Only include timestamps that match defined time ranges
                    if check_in_hour not in time_ranges:
                        continue
                except (ValueError, TypeError):
                    # Skip invalid timestamps
                    continue

                time_counts[check_in_hour] += 1

            # Append results for each site
            for time, count in time_counts.items():
                result[time].append({"site": site_name, "count": count})

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route('/api/check_in_times', methods=['GET'])
def get_check_in_times():
    try:
        # Define timezone conversion (UTC to UTC+7)
        local_timezone = pytz.timezone("Asia/Bangkok")
        
        # Fetch check-in records
        check_ins = check_in_collection.find({}, {"timestamp": 1})  # Only fetch the timestamp field
        converted_times = []
        
        for check_in in check_ins:
            # Extract and convert timestamp
            utc_time = check_in["timestamp"]
            if isinstance(utc_time, datetime):  # Ensure it's a datetime object
                # Convert to Asia/Bangkok timezone
                local_time = utc_time.replace(tzinfo=pytz.utc).astimezone(local_timezone)
                converted_times.append({
                    "original_timestamp": utc_time.isoformat(),
                    "converted_timestamp": local_time.isoformat()
                })
        
        return jsonify(converted_times)
    except Exception as e:
        return jsonify({"error": str(e)}), 500



time_labels = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00"]
# API endpoint to fetch, convert timestamps, find nearest site, and group by time labels
@app.route('/api/check_in_count_by_site_time_v2', methods=['GET'])
def check_in_count_by_site_time_v2():

    try:
        # Set up timezone conversion to UTC+7
        local_timezone = pytz.timezone("Asia/Bangkok")

        # Fetch all corp_sites and store their locations
        corp_sites = list(corp_site_collection.find({}))
        corp_locations = {
            site["_id"]: {
                "location_name": site["location_name"],
                "coordinates": (float(site["lat"]), float(site["long"]))
            }
            for site in corp_sites
        }

        # Initialize result structure for each site and each time label
        result = {site["location_name"]: {label: 0 for label in time_labels} for site in corp_sites}

        # Fetch check-in records
        check_ins = check_in_collection.find({}, {"timestamp": 1, "current_lat": 1, "current_long": 1})

        for check_in in check_ins:
            # Convert timestamp to local time
            utc_time = check_in["timestamp"]
            if isinstance(utc_time, datetime):
                local_time = utc_time.replace(tzinfo=pytz.utc).astimezone(local_timezone)
                local_hour = local_time.strftime("%H:00")

                # Only proceed if the hour is in the defined time labels
                if local_hour in time_labels:
                    check_in_coords = (float(check_in["current_lat"]), float(check_in["current_long"]))

                    # Find the nearest corp_site
                    nearest_site_id = None
                    nearest_distance = float("inf")
                    for site_id, site_data in corp_locations.items():
                        site_coords = site_data["coordinates"]
                        distance = geodesic(check_in_coords, site_coords).kilometers
                        if distance < 1:  # Check within a 1 km radius
                            if distance < nearest_distance:
                                nearest_distance = distance
                                nearest_site_id = site_id

                    # Increment count for the nearest site and time label
                    if nearest_site_id:
                        site_name = corp_locations[nearest_site_id]["location_name"]
                        result[site_name][local_hour] += 1

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -> line chart
@app.route('/api/check_in_count_by_site_time_v3', methods=['GET'])
def check_in_count_by_site_time_v3():
    try:
        # Get date range from query parameters
        # Corrected lines in your API
        start_date_str = request.args.get('start_date')  # Match the query parameter name
        end_date_str = request.args.get('end_date')      # Match the query parameter name


        # Convert date strings to datetime objects
        if start_date_str and end_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d')

        else:
            # Default to a wide range if no dates are provided
            start_date = datetime(2000, 1, 1)
            end_date = datetime(2100, 1, 1)

        # Set up timezone conversion to UTC+7
        local_timezone = pytz.timezone("Asia/Bangkok")

        # Fetch all corp_sites and store their locations
        corp_sites = list(corp_site_collection.find({}))
        corp_locations = {
            str(site["_id"]): {
                "location_name": site["location_name"],
                "coordinates": (float(site["lat"]), float(site["long"]))
            }
            for site in corp_sites
        }

        # Initialize result structure for each site and each time label
        result = {site["location_name"]: {label: 0 for label in time_labels} for site in corp_sites}

        # Fetch check-in records within the date range
        check_ins = check_in_collection.find({
            "timestamp": {"$gte": start_date, "$lt": end_date}
        }, {"timestamp": 1, "current_lat": 1, "current_long": 1})

        for check_in in check_ins:
            # Convert timestamp to local time
            utc_time = check_in.get("timestamp")
            if isinstance(utc_time, datetime):
                local_time = utc_time.replace(tzinfo=pytz.utc).astimezone(local_timezone)
                local_hour = local_time.strftime("%H:00")

                # Only proceed if the hour is in the defined time labels
                if local_hour in time_labels:
                    check_in_coords = (float(check_in["current_lat"]), float(check_in["current_long"]))

                    # Find the nearest corp_site
                    nearest_site_id = None
                    nearest_distance = float("inf")
                    for site_id, site_data in corp_locations.items():
                        site_coords = site_data["coordinates"]
                        distance = geodesic(check_in_coords, site_coords).kilometers
                        if distance < 1:  # Check within a 1 km radius
                            if distance < nearest_distance:
                                nearest_distance = distance
                                nearest_site_id = site_id

                    # Increment count for the nearest site and time label
                    if nearest_site_id:
                        site_name = corp_locations[nearest_site_id]["location_name"]
                        result[site_name][local_hour] += 1

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# bar chart / pie chart
@app.route('/api/check_in_summary_by_time', methods=['GET'])
def check_in_summary_by_time():

    try:
        # Set up timezone conversion to UTC+7
        local_timezone = pytz.timezone("Asia/Bangkok")
        
        # Define the 10 AM cutoff time in local time
        cutoff_hour = 10

        # Fetch corp sites
        corp_sites = list(corp_site_collection.find())
        result = {}

        for site in corp_sites:
            site_name = site["location_name"]
            site_lat = float(site["lat"])
            site_long = float(site["long"])

            # Initialize count for each category
            check_in_before_10 = 0
            check_in_after_10 = 0

            # Fetch check-ins near the site
            check_ins = check_in_collection.find({
                "current_lat": {"$gte": site_lat - 0.01, "$lte": site_lat + 0.01},
                "current_long": {"$gte": site_long - 0.01, "$lte": site_long + 0.01}
            })

            for check_in in check_ins:
                timestamp = check_in.get("timestamp")
                if isinstance(timestamp, datetime):
                    # Convert to local time
                    local_time = timestamp.astimezone(local_timezone)
                    check_in_hour = local_time.hour

                    # Categorize based on check-in time
                    if check_in_hour < cutoff_hour:
                        check_in_before_10 += 1
                    else:
                        check_in_after_10 += 1

            # Add results for the site
            result[site_name] = {
                "on_time": check_in_before_10,
                "late": check_in_after_10
            }

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


#for bar chart
@app.route('/api/check_in_summary_by_time_v2', methods=['GET']) 
def check_in_summary_by_time_v2():
    try:
        # Get date range from query parameters
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')

        # Convert date strings to datetime objects
        if start_date_str and end_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
        else:
            # Default to a wide range if no dates are provided
            start_date = datetime(2000, 1, 1)
            end_date = datetime(2100, 1, 1)

        # Set up timezone conversion to UTC+7
        local_timezone = pytz.timezone("Asia/Bangkok")

        # Define the 10 AM cutoff time in local time
        cutoff_hour = 10

        # Fetch corp sites
        corp_sites = list(corp_site_collection.find())
        result = {}

        for site in corp_sites:
            site_name = site["location_name"]
            site_lat = float(site["lat"])
            site_long = float(site["long"])

            # Initialize count for each category
            check_in_before_10 = 0
            check_in_after_10 = 0

            # Fetch check-ins near the site within the date range
            check_ins = check_in_collection.find({
                "timestamp": {"$gte": start_date, "$lt": end_date},
                "current_lat": {"$gte": site_lat - 0.01, "$lte": site_lat + 0.01},
                "current_long": {"$gte": site_long - 0.01, "$lte": site_long + 0.01}
            })

            for check_in in check_ins:
                timestamp = check_in.get("timestamp")
                if isinstance(timestamp, datetime):
                    # Convert to local time
                    local_time = timestamp.astimezone(local_timezone)
                    check_in_hour = local_time.hour

                    # Categorize based on check-in time
                    if check_in_hour < cutoff_hour:
                        check_in_before_10 += 1
                    else:
                        check_in_after_10 += 1

            # Add results for the site
            result[site_name] = {
                "on_time": check_in_before_10,
                "late": check_in_after_10
            }

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# on time count
@app.route('/api/checkins/onTimeToday', methods=['GET'])
def get_on_time_checkins_today():
    try:
        # Define the timezone (e.g., 'Asia/Bangkok')
        local_timezone = pytz.timezone("Asia/Bangkok")
        current_date = datetime.now(local_timezone).date()

        # Define the start and end of the current day in local time
        start_of_day = local_timezone.localize(datetime.combine(current_date, datetime.min.time()))
        end_of_day = local_timezone.localize(datetime.combine(current_date, datetime.max.time()))

        # Query all check-ins within the current day
        check_ins = check_in_collection.find({
            "checkInTime": {"$gte": start_of_day, "$lte": end_of_day}
        })

        # Count the number of on-time check-ins after converting to local time
        on_time_count = 0
        for check_in in check_ins:
            utc_time = check_in.get("checkInTime")
            if isinstance(utc_time, datetime):
                # Convert UTC time to local time
                local_time = utc_time.replace(tzinfo=pytz.utc).astimezone(local_timezone)
                local_hour = local_time.strftime("%H:00")

                # Logic to determine if the check-in is on time (customize this as needed)
                if check_in.get("onTime", False):
                    on_time_count += 1

        return jsonify({"count": on_time_count})
    except Exception as e:
        return jsonify({"error": "Internal Server Error"}), 500


@app.route('/api/check_in_percentage', methods=['GET'])
def check_in_percentage():
    try:
        # Get date range from query parameters
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')

        # Convert date strings to datetime objects
        if start_date_str and end_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
        else:
            # Default to a wide range if no dates are provided
            start_date = datetime(2000, 1, 1)
            end_date = datetime(2100, 1, 1)

        # Set up timezone conversion to UTC+7
        local_timezone = pytz.timezone("Asia/Bangkok")

        # Define the 10 AM cutoff time in local time
        cutoff_hour = 10

        # Initialize counts
        check_in_before_10 = 0
        total_check_ins = 0

        # Fetch check-ins within the date range
        check_ins = check_in_collection.find({
            "timestamp": {"$gte": start_date, "$lt": end_date}
        })

        for check_in in check_ins:
            timestamp = check_in.get("timestamp")
            if isinstance(timestamp, datetime):
                # Convert to local time
                local_time = timestamp.astimezone(local_timezone)
                check_in_hour = local_time.hour

                # Categorize based on check-in time
                if check_in_hour < cutoff_hour:
                    check_in_before_10 += 1

                total_check_ins += 1

        # Calculate percentage
        on_time_percentage = (check_in_before_10 / total_check_ins * 100) if total_check_ins > 0 else 0

        return jsonify({"on_time_percentage": round(on_time_percentage, 2)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500



if __name__ == '__main__':
    app.run(debug=True)
