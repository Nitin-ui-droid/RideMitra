import requests


url = "http://127.0.0.1:5000/api/rides"


ride = {

    "driver_id": 1,

    "from": "Kanpur",

    "to": "Mumbai",

    "date": "2026-08-20",

    "time": "06:00",

    "seats": 3,

    "price": 1500,

    "vehicle": "Maruti Swift"

}


response = requests.post(
    url,
    json=ride
)


print(response.status_code)

print(response.json())