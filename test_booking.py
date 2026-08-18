import requests

url = "http://127.0.0.1:5000/api/bookings"

data = {
    "ride_id": 2,
    "passenger_id": 1,
    "seats_booked": 1
}

response = requests.post(url, json=data)

print("Status Code:", response.status_code)
print("Response:", response.json())