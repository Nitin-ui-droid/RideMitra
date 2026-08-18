from werkzeug.security import generate_password_hash
import mysql.connector

db = mysql.connector.connect(
    host="localhost",
    port=3306,
    user="root",
    password="Nitinpandey00@",
    database="ridemitra"
)

cursor = db.cursor()

password = "Test@123"
hashed_password = generate_password_hash(password)

cursor.execute(
    "UPDATE users SET password = %s WHERE email = %s",
    (hashed_password, "test@ridemitra.com")
)

db.commit()

cursor.close()
db.close()

print("Password hashed successfully! 🔐")