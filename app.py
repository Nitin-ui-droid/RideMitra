import os
from functools import wraps

from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import mysql.connector

load_dotenv()


# =========================================================
# RIDEMITRA FLASK APPLICATION
# =========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(
    __name__,
    static_folder=BASE_DIR,
    static_url_path=""
)


# =========================================================
# APPLICATION SECRET
# =========================================================

SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY environment variable is not set"
    )

app.secret_key = SECRET_KEY


# =========================================================
# SESSION CONFIGURATION
# =========================================================

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",

    # Localhost = False
    # Production HTTPS = True
    SESSION_COOKIE_SECURE=(
        os.getenv("FLASK_ENV") == "production"
    )
)


# =========================================================
# CORS
# =========================================================

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": os.getenv("CORS_ORIGINS", "*").split(",")
        }
    },
    supports_credentials=True
) 

# =========================================================
# DATABASE CONNECTION
# =========================================================

def get_db_connection():

    required_variables = [
        "DB_HOST",
        "DB_PORT",
        "DB_USER",
        "DB_PASSWORD",
        "DB_NAME"
    ]

    missing_variables = [
        variable
        for variable in required_variables
        if not os.getenv(variable)
    ]

    if missing_variables:
        raise RuntimeError(
            "Missing database environment variables: "
            + ", ".join(missing_variables)
        )

    return mysql.connector.connect(
        host=os.environ["DB_HOST"],
        port=int(os.environ["DB_PORT"]),
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        database=os.environ["DB_NAME"],
        autocommit=False
    )


# =========================================================
# RESPONSE HELPERS
# =========================================================

def success_response(message, data=None, status=200):

    response = {
        "success": True,
        "message": message
    }

    if data is not None:
        response.update(data)

    return jsonify(response), status


def error_response(message, status=400):

    return jsonify({
        "success": False,
        "message": message
    }), status


# =========================================================
# AUTHENTICATION HELPER
# =========================================================

def login_required(func):

    @wraps(func)
    def wrapper(*args, **kwargs):

        if not session.get("user_id"):

            return error_response(
                "Authentication required. Please login first.",
                401
            )

        return func(*args, **kwargs)

    return wrapper


# =========================================================
# FRONTEND ROUTES
# =========================================================

@app.route("/")
def home():

    return send_from_directory(
        BASE_DIR,
        "index.html"
    )


@app.route("/<path:filename>")
def serve_frontend(filename):

    # API routes should never reach this handler
    if filename.startswith("api/"):
        return error_response("API endpoint not found.", 404)

    return send_from_directory(
        BASE_DIR,
        filename
    )


# =========================================================
# REGISTER
# =========================================================

@app.route("/api/register", methods=["POST"])
def register():

    db = None
    cursor = None

    try:

        data = request.get_json(silent=True) or {}

        name = str(
            data.get("name", "")
        ).strip()

        email = str(
            data.get("email", "")
        ).strip().lower()

        phone = str(
            data.get("phone", "")
        ).strip()

        password = str(
            data.get("password", "")
        )


        # =================================================
        # VALIDATION
        # =================================================

        if not name or not email or not phone or not password:
            return error_response(
                "All fields are required."
            )

        if len(name) < 2:
            return error_response(
                "Please enter a valid name."
            )

        if "@" not in email or "." not in email.split("@")[-1]:
            return error_response(
                "Please enter a valid email address."
            )

        if not phone.isdigit() or len(phone) != 10:
            return error_response(
                "Please enter a valid 10-digit phone number."
            )

        if len(password) < 6:
            return error_response(
                "Password must contain at least 6 characters."
            )


        # =================================================
        # DATABASE
        # =================================================

        db = get_db_connection()

        cursor = db.cursor(
            dictionary=True
        )


        # Check existing email

        cursor.execute(
            """
            SELECT user_id
            FROM users
            WHERE email = %s
            LIMIT 1
            """,
            (email,)
        )

        if cursor.fetchone():

            return error_response(
                "Email already registered.",
                409
            )


        # Check existing phone

        cursor.execute(
            """
            SELECT user_id
            FROM users
            WHERE phone = %s
            LIMIT 1
            """,
            (phone,)
        )

        if cursor.fetchone():

            return error_response(
                "Phone number already registered.",
                409
            )


        # Hash password

        hashed_password = generate_password_hash(
            password
        )


        # Create user

        cursor.execute(
            """
            INSERT INTO users
            (
                name,
                email,
                phone,
                password
            )
            VALUES
            (%s, %s, %s, %s)
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


        return success_response(
            "Account created successfully.",
            {
                "user": {
                    "user_id": user_id,
                    "name": name,
                    "email": email,
                    "phone": phone
                }
            },
            201
        )


    except mysql.connector.Error:

        if db:
            db.rollback()

        app.logger.exception(
            "REGISTER DATABASE ERROR"
        )

        return error_response(
            "Database error during registration.",
            500
        )


    except Exception:

        if db:
            db.rollback()

        app.logger.exception(
            "REGISTER ERROR"
        )

        return error_response(
            "Unable to create account.",
            500
        )


    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()


# =========================================================
# LOGIN
# =========================================================

@app.route("/api/login", methods=["POST"])
def login():

    db = None
    cursor = None

    try:

        data = request.get_json(silent=True) or {}

        email = str(
            data.get("email", "")
        ).strip().lower()

        password = str(
            data.get("password", "")
        )


        if not email or not password:

            return error_response(
                "Email and password are required."
            )


        db = get_db_connection()

        cursor = db.cursor(
            dictionary=True
        )


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


        if not user:

            return error_response(
                "Invalid email or password.",
                401
            )


        if not check_password_hash(
            user["password"],
            password
        ):

            return error_response(
                "Invalid email or password.",
                401
            )


        # =================================================
        # CREATE AUTHENTICATED SESSION
        # =================================================

        session.clear()

        session["user_id"] = int(
            user["user_id"]
        )

        session.permanent = True


        return success_response(
            "Login successful.",
            {
                "user": {
                    "user_id": user["user_id"],
                    "name": user["name"],
                    "email": user["email"],
                    "phone": user["phone"]
                }
            }
        )


    except mysql.connector.Error:

        app.logger.exception(
            "LOGIN DATABASE ERROR"
        )

        return error_response(
            "Database error during login.",
            500
        )


    except Exception:

        app.logger.exception(
            "LOGIN ERROR"
        )

        return error_response(
            "Unable to login.",
            500
        )


    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()


# =========================================================
# CURRENT LOGGED-IN USER
# =========================================================

@app.route("/api/me", methods=["GET"])
@login_required
def get_current_user():

    db = None
    cursor = None

    try:

        user_id = session.get("user_id")

        db = get_db_connection()

        cursor = db.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                user_id,
                name,
                email,
                phone,
                created_at
            FROM users
            WHERE user_id = %s
            LIMIT 1
            """,
            (user_id,)
        )

        user = cursor.fetchone()


        if not user:

            session.clear()

            return error_response(
                "User account not found.",
                404
            )


        if user.get("created_at") is not None:

            user["created_at"] = str(
                user["created_at"]
            )


        return success_response(
            "User loaded successfully.",
            {
                "user": user
            }
        )


    except mysql.connector.Error:

        app.logger.exception(
            "GET CURRENT USER DATABASE ERROR"
        )

        return error_response(
            "Database error while loading user.",
            500
        )


    except Exception:

        app.logger.exception(
            "GET CURRENT USER ERROR"
        )

        return error_response(
            "Unable to load user.",
            500
        )


    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()


# =========================================================
# LOGOUT
# =========================================================

@app.route("/api/logout", methods=["POST"])
def logout():

    session.clear()

    return success_response(
        "Logged out successfully."
    )


# =========================================================
# CREATE RIDE
# =========================================================

@app.route("/api/rides", methods=["POST"])
@login_required
def create_ride():

    db = None
    cursor = None

    try:

        data = request.get_json(silent=True) or {}


        # Authenticated user only
        driver_id = session.get("user_id")


        from_location = str(
            data.get("from", "")
        ).strip()

        destination = str(
            data.get("to", "")
        ).strip()

        travel_date = str(
            data.get("date", "")
        ).strip()

        departure_time = str(
            data.get("time", "")
        ).strip()

        vehicle = str(
            data.get("vehicle", "")
        ).strip()


        try:
            available_seats = int(
                data.get("seats", 0)
            )
        except (ValueError, TypeError):
            available_seats = 0


        try:
            price_per_seat = float(
                data.get("price", 0)
            )
        except (ValueError, TypeError):
            price_per_seat = -1


        # =================================================
        # VALIDATION
        # =================================================

        if not driver_id:

            return error_response(
                "Please login before publishing a ride.",
                401
            )

        if not from_location:

            return error_response(
                "Starting location is required."
            )

        if not destination:

            return error_response(
                "Destination is required."
            )

        if from_location.lower() == destination.lower():

            return error_response(
                "Starting location and destination cannot be the same."
            )

        if not travel_date:

            return error_response(
                "Travel date is required."
            )

        if not departure_time:

            return error_response(
                "Departure time is required."
            )

        if available_seats < 1 or available_seats > 8:

            return error_response(
                "Seats must be between 1 and 8."
            )

        if price_per_seat < 0:

            return error_response(
                "Please enter a valid price."
            )

        if not vehicle:

            return error_response(
                "Vehicle information is required."
            )


        # =================================================
        # DATABASE
        # =================================================

        db = get_db_connection()

        cursor = db.cursor(
            dictionary=True
        )


        # Verify user

        cursor.execute(
            """
            SELECT user_id
            FROM users
            WHERE user_id = %s
            LIMIT 1
            """,
            (driver_id,)
        )

        driver = cursor.fetchone()


        if not driver:

            session.clear()

            return error_response(
                "Driver account not found.",
                404
            )


        # =================================================
        # CREATE RIDE
        # =================================================

        cursor.execute(
            """
            INSERT INTO rides
            (
                driver_id,
                from_location,
                destination,
                travel_date,
                departure_time,
                available_seats,
                price_per_seat,
                vehicle,
                status
            )
            VALUES
            (
                %s, %s, %s, %s, %s,
                %s, %s, %s, 'available'
            )
            """,
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
        )

        ride_id = cursor.lastrowid

        db.commit()


        return success_response(
            "Ride published successfully!",
            {
                "ride": {
                    "ride_id": ride_id,
                    "driver_id": driver_id,
                    "from": from_location,
                    "to": destination,
                    "date": travel_date,
                    "time": departure_time,
                    "seats": available_seats,
                    "price": price_per_seat,
                    "vehicle": vehicle,
                    "status": "available"
                }
            },
            201
        )


    except mysql.connector.Error:

        if db:
            db.rollback()

        app.logger.exception(
            "CREATE RIDE DATABASE ERROR"
        )

        return error_response(
            "Database error while publishing ride.",
            500
        )


    except Exception:

        if db:
            db.rollback()

        app.logger.exception(
            "CREATE RIDE ERROR"
        )

        return error_response(
            "Unable to publish ride.",
            500
        )


    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()


# =========================================================
# GET ALL AVAILABLE RIDES
# =========================================================

@app.route("/api/rides", methods=["GET"])
@login_required
def get_rides():

    db = None
    cursor = None

    try:

        db = get_db_connection()

        cursor = db.cursor(
            dictionary=True
        )


        cursor.execute(
            """
            SELECT
                r.ride_id,
                r.driver_id,
                u.name AS driver_name,
                r.from_location,
                r.destination,
                r.travel_date,
                r.departure_time,
                r.available_seats,
                r.price_per_seat,
                r.vehicle,
                r.status,
                r.created_at
            FROM rides r
            INNER JOIN users u
                ON r.driver_id = u.user_id
            WHERE r.status = 'available'
            ORDER BY
                r.created_at DESC
            """
        )

        rides = cursor.fetchall()


        # JSON serialization

        for ride in rides:

            if ride.get("travel_date") is not None:

                ride["travel_date"] = str(
                    ride["travel_date"]
                )

            if ride.get("departure_time") is not None:

                ride["departure_time"] = str(
                    ride["departure_time"]
                )

            if ride.get("created_at") is not None:

                ride["created_at"] = str(
                    ride["created_at"]
                )

            if ride.get("price_per_seat") is not None:

                ride["price_per_seat"] = float(
                    ride["price_per_seat"]
                )


        return success_response(
            "Rides loaded successfully.",
            {
                "rides": rides,
                "count": len(rides)
            }
        )


    except mysql.connector.Error:

        app.logger.exception(
            "GET RIDES DATABASE ERROR"
        )

        return error_response(
            "Database error while loading rides.",
            500
        )


    except Exception:

        app.logger.exception(
            "GET RIDES ERROR"
        )

        return error_response(
            "Unable to load rides.",
            500
        )


    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()


# =========================================================
# BOOK RIDE
# =========================================================

@app.route("/api/bookings", methods=["POST"])
@login_required
def create_booking():

    db = None
    cursor = None

    try:

        data = request.get_json(silent=True) or {}

        ride_id = data.get("ride_id")

        passenger_id = session.get(
            "user_id"
        )


        try:

            seats_booked = int(
                data.get("seats_booked", 1)
            )

        except (ValueError, TypeError):

            seats_booked = 0


        # =================================================
        # VALIDATION
        # =================================================

        if not ride_id:

            return error_response(
                "Ride ID is required."
            )

        if seats_booked < 1 or seats_booked > 8:

            return error_response(
                "Please select a valid number of seats."
            )


        # =================================================
        # DATABASE TRANSACTION
        # =================================================

        db = get_db_connection()

        cursor = db.cursor(
            dictionary=True
        )


        cursor.execute(
            """
            SELECT
                ride_id,
                driver_id,
                available_seats,
                status
            FROM rides
            WHERE ride_id = %s
            FOR UPDATE
            """,
            (ride_id,)
        )

        ride = cursor.fetchone()


        if not ride:

            return error_response(
                "Ride not found.",
                404
            )


        if ride["status"] != "available":

            return error_response(
                "This ride is no longer available."
            )


        if int(ride["driver_id"]) == int(passenger_id):

            return error_response(
                "You cannot book your own ride."
            )


        if int(ride["available_seats"]) < seats_booked:

            return error_response(
                "Not enough seats available."
            )


        # Prevent duplicate booking

        cursor.execute(
            """
            SELECT booking_id
            FROM ride_bookings
            WHERE ride_id = %s
            AND passenger_id = %s
            LIMIT 1
            """,
            (
                ride_id,
                passenger_id
            )
        )

        if cursor.fetchone():

            return error_response(
                "You have already booked this ride.",
                409
            )


        # Create booking

        cursor.execute(
            """
            INSERT INTO ride_bookings
            (
                ride_id,
                passenger_id,
                seats_booked
            )
            VALUES
            (%s, %s, %s)
            """,
            (
                ride_id,
                passenger_id,
                seats_booked
            )
        )

        booking_id = cursor.lastrowid


        # Update seats

        cursor.execute(
            """
            UPDATE rides
            SET available_seats =
                available_seats - %s
            WHERE ride_id = %s
            AND available_seats >= %s
            """,
            (
                seats_booked,
                ride_id,
                seats_booked
            )
        )


        if cursor.rowcount != 1:

            db.rollback()

            return error_response(
                "Seats are no longer available. Please try again."
            )


        # Mark full ride

        cursor.execute(
            """
            UPDATE rides
            SET status = 'booked'
            WHERE ride_id = %s
            AND available_seats = 0
            """,
            (ride_id,)
        )


        db.commit()


        return success_response(
            "Ride booked successfully.",
            {
                "booking_id": booking_id
            },
            201
        )


    except mysql.connector.Error:

        if db:
            db.rollback()

        app.logger.exception(
            "BOOKING DATABASE ERROR"
        )

        return error_response(
            "Database error while booking ride.",
            500
        )


    except Exception:

        if db:
            db.rollback()

        app.logger.exception(
            "BOOKING ERROR"
        )

        return error_response(
            "Unable to book ride.",
            500
        )


    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()


# =========================================================
# HEALTH CHECK
# =========================================================

@app.route("/api/health", methods=["GET"])
def health_check():

    return jsonify({
        "success": True,
        "message": "RideMitra API is running."
    }), 200


# =========================================================
# RUN SERVER
# =========================================================

if __name__ == "__main__":

    port = int(
        os.getenv("PORT", "5000")
    )

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )