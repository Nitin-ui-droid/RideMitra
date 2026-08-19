from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import mysql.connector


# ==========================================
# RIDEMITRA FLASK APPLICATION
# ==========================================

app = Flask(__name__, static_folder=".", static_url_path="")

app.secret_key = "ridemitra-development-secret-key"

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": "*"
        }
    }
)


# ==========================================
# DATABASE
# ==========================================

def get_db_connection():

    return mysql.connector.connect(
        host="localhost",
        port=3306,
        user="root",
        password="Nitinpandey00@",
        database="ridemitra",
        autocommit=False
    )


# ==========================================
# HOME / SERVER TEST
# ==========================================

@app.route("/")
def home():
    return send_from_directory(".", "index.html")

@app.route("/<path:filename>")
def serve_frontend(filename):
    return send_from_directory(".", filename)


# ==========================================
# TEST USER
# ==========================================

@app.route("/test-user")
def test_user():

    db = get_db_connection()
    cursor = db.cursor()

    try:

        password = "Test@123"
        hashed_password = generate_password_hash(password)

        sql = """
            INSERT INTO users
            (name, email, phone, password)
            VALUES (%s, %s, %s, %s)
        """

        values = (
            "Test User",
            "test@ridemitra.com",
            "9999999999",
            hashed_password
        )

        cursor.execute(sql, values)
        db.commit()

        return "Test user saved successfully! 👤"

    except mysql.connector.Error as error:

        return jsonify({
            "success": False,
            "message": str(error)
        }), 500

    finally:

        cursor.close()
        db.close()


# ==========================================
# REGISTER
# ==========================================

@app.route("/api/register", methods=["POST"])
def register():

    try:

        data = request.get_json(silent=True) or {}

        name = str(data.get("name", "")).strip()
        email = str(data.get("email", "")).strip().lower()
        phone = str(data.get("phone", "")).strip()
        password = str(data.get("password", ""))

        # -------------------------------
        # Validation
        # -------------------------------

        if not name or not email or not phone or not password:

            return jsonify({
                "success": False,
                "message": "All fields are required."
            }), 400

        if len(name) < 2:

            return jsonify({
                "success": False,
                "message": "Please enter a valid name."
            }), 400

        if len(password) < 6:

            return jsonify({
                "success": False,
                "message": "Password must contain at least 6 characters."
            }), 400

        if not phone.isdigit() or len(phone) != 10:

            return jsonify({
                "success": False,
                "message": "Please enter a valid 10-digit phone number."
            }), 400


        # -------------------------------
        # Database
        # -------------------------------

        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        try:

            cursor.execute(
                """
                SELECT user_id
                FROM users
                WHERE email = %s
                LIMIT 1
                """,
                (email,)
            )

            existing_user = cursor.fetchone()

            if existing_user:

                return jsonify({
                    "success": False,
                    "message": "Email already registered."
                }), 409


            hashed_password = generate_password_hash(password)

            cursor.execute(
                """
                INSERT INTO users
                (name, email, phone, password)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    name,
                    email,
                    phone,
                    hashed_password
                )
            )

            db.commit()

            user_id = cursor.lastrowid

            return jsonify({
                "success": True,
                "message": "Account created successfully.",
                "user": {
                    "user_id": user_id,
                    "name": name,
                    "email": email
                }
            }), 201

        finally:

            cursor.close()
            db.close()

    except mysql.connector.Error as error:

        return jsonify({
            "success": False,
            "message": "Database error: " + str(error)
        }), 500

    except Exception as error:

        return jsonify({
            "success": False,
            "message": "Registration error: " + str(error)
        }), 500


# ==========================================
# LOGIN
# ==========================================

@app.route("/api/login", methods=["POST"])
def login():

    try:

        data = request.get_json(silent=True) or {}

        email = str(data.get("email", "")).strip().lower()
        password = str(data.get("password", ""))

        if not email or not password:

            return jsonify({
                "success": False,
                "message": "Email and password are required."
            }), 400


        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        try:

            cursor.execute(
                """
                SELECT
                    user_id,
                    name,
                    email,
                    phone,
                    password
                FROM users
                WHERE email = %s
                LIMIT 1
                """,
                (email,)
            )

            user = cursor.fetchone()

        finally:

            cursor.close()
            db.close()


        if not user:

            return jsonify({
                "success": False,
                "message": "Invalid email or password."
            }), 401


        if not check_password_hash(user["password"], password):

            return jsonify({
                "success": False,
                "message": "Invalid email or password."
            }), 401


        # Store server session
        session["user_id"] = user["user_id"]


        return jsonify({
            "success": True,
            "message": "Login successful.",
            "user": {
                "user_id": user["user_id"],
                "name": user["name"],
                "email": user["email"],
                "phone": user.get("phone")
            }
        }), 200


    except mysql.connector.Error as error:

        return jsonify({
            "success": False,
            "message": "Database error: " + str(error)
        }), 500

    except Exception as error:

        return jsonify({
            "success": False,
            "message": "Login error: " + str(error)
        }), 500


# ==========================================
# LOGOUT
# ==========================================

@app.route("/api/logout", methods=["POST"])
def logout():

    session.clear()

    return jsonify({
        "success": True,
        "message": "Logged out successfully."
    })


# ==========================================
# CREATE RIDE
# ==========================================

@app.route("/api/rides", methods=["POST"])
def create_ride():

    try:

        data = request.get_json(silent=True) or {}

        driver_id = data.get("driver_id")
        from_location = data.get("from")
        destination = data.get("to")
        travel_date = data.get("date")
        departure_time = data.get("time")
        available_seats = data.get("seats")
        price_per_seat = data.get("price")
        vehicle = data.get("vehicle")

        if not driver_id:
            return jsonify({
                "success": False,
                "message": "Driver ID is required."
            }), 400

        db = get_db_connection()
        cursor = db.cursor()

        try:

            sql = """
                INSERT INTO rides
                (
                    driver_id,
                    from_location,
                    destination,
                    travel_date,
                    departure_time,
                    available_seats,
                    price_per_seat,
                    vehicle
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """

            values = (
                driver_id,
                from_location,
                destination,
                travel_date,
                departure_time,
                available_seats,
                price_per_seat,
                vehicle
            )

            cursor.execute(sql, values)

            db.commit()

            ride_id = cursor.lastrowid

            return jsonify({
                "success": True,
                "message": "Ride created successfully!",
                "ride_id": ride_id
            }), 201

        finally:

            cursor.close()
            db.close()

    except mysql.connector.Error as error:

        return jsonify({
            "success": False,
            "message": "Database error: " + str(error)
        }), 500


# ==========================================
# GET RIDES
# ==========================================

@app.route("/api/rides", methods=["GET"])
def get_rides():

    try:

        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        try:

            sql = """
                SELECT
                    rides.ride_id,
                    rides.driver_id,
                    users.name AS driver_name,
                    rides.from_location,
                    rides.destination,
                    rides.travel_date,
                    rides.departure_time,
                    rides.available_seats,
                    rides.price_per_seat,
                    rides.vehicle,
                    rides.status
                FROM rides
                INNER JOIN users
                    ON rides.driver_id = users.user_id
                WHERE rides.status = 'available'
                ORDER BY rides.created_at DESC
            """

            cursor.execute(sql)

            rides = cursor.fetchall()

            for ride in rides:

                if ride["departure_time"] is not None:
                    ride["departure_time"] = str(
                        ride["departure_time"]
                    )

                if ride["travel_date"] is not None:
                    ride["travel_date"] = str(
                        ride["travel_date"]
                    )

            return jsonify(rides)

        finally:

            cursor.close()
            db.close()

    except mysql.connector.Error as error:

        return jsonify({
            "success": False,
            "message": "Unable to load rides."
        }), 500


# ==========================================
# BOOK RIDE
# ==========================================

@app.route("/api/bookings", methods=["POST"])
def create_booking():

    try:

        data = request.get_json(silent=True) or {}

        ride_id = data.get("ride_id")
        passenger_id = data.get("passenger_id")
        seats_booked = data.get("seats_booked", 1)

        if not ride_id or not passenger_id:

            return jsonify({
                "success": False,
                "message": "Ride ID and Passenger ID are required."
            }), 400


        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        try:

            cursor.execute(
                """
                SELECT available_seats
                FROM rides
                WHERE ride_id = %s
                AND status = 'available'
                """,
                (ride_id,)
            )

            ride = cursor.fetchone()

            if not ride:

                return jsonify({
                    "success": False,
                    "message": "Ride not found."
                }), 404


            if ride["available_seats"] < seats_booked:

                return jsonify({
                    "success": False,
                    "message": "Not enough seats available."
                }), 400


            cursor.execute(
                """
                INSERT INTO ride_bookings
                (ride_id, passenger_id, seats_booked)
                VALUES (%s, %s, %s)
                """,
                (
                    ride_id,
                    passenger_id,
                    seats_booked
                )
            )

            cursor.execute(
                """
                UPDATE rides
                SET available_seats =
                    available_seats - %s
                WHERE ride_id = %s
                """,
                (
                    seats_booked,
                    ride_id
                )
            )

            db.commit()

            booking_id = cursor.lastrowid

            return jsonify({
                "success": True,
                "message": "Ride joined successfully.",
                "booking_id": booking_id
            }), 201

        finally:

            cursor.close()
            db.close()

    except mysql.connector.Error as error:

        return jsonify({
            "success": False,
            "message": "Booking failed: " + str(error)
        }), 500


# ==========================================
# RUN SERVER
# ==========================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )