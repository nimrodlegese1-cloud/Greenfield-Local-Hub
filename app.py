from flask import Flask, jsonify, request, render_template
import sqlite3
import uuid
from datetime import datetime
import os
import re

app = Flask(__name__)
print("Database location:", os.path.abspath("users.db"))


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "users.db")

#-------------DATABASE SETUP-------------#
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    #----Users Table----#
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL
    )
    """)

    #----Login Logs Table----#
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS login_logs (
        log_id TEXT PRIMARY KEY,
        username TEXT,
        login_time TEXT
    )
    """)

    #----Products Table----#
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        image TEXT,
        stock INTEGER NOT NULL,
        category TEXT NOT NULL
    )
    """)

    #----Basket Table----#
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS basket (
        basket_id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity INTEGER NOT NULL
    )
    """)

    #----Default admin account----#
    cursor.execute("SELECT * FROM users WHERE username = ?", ("admin",))
    admin_exists = cursor.fetchone()

    if not admin_exists:
        cursor.execute(
            "INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)",
            (str(uuid.uuid4())[:8], "admin", "1234", "admin")
        )

    #----Default products (only add once)----#
    cursor.execute("SELECT COUNT(*) FROM products")
    product_count = cursor.fetchone()[0]

    if product_count == 0:
        products = [
            (str(uuid.uuid4())[:8], "Broccoli", 2.16, "broccoli.png", 300, "Vegetable"),
            (str(uuid.uuid4())[:8], "Cucumber", 0.71, "cucumber.png", 235, "Vegetable"),
            (str(uuid.uuid4())[:8], "Mushroom", 2.32, "mushroom.png", 341, "Vegetable"),
            (str(uuid.uuid4())[:8], "Bell Peppers", 1.80, "bellpeppers.png", 183, "Vegetable"),
            (str(uuid.uuid4())[:8], "Carrots", 1.39, "carrots.png", 265, "Vegetable"),
            (str(uuid.uuid4())[:8], "Napa Cabbage", 1.50, "napacabbage.png", 156, "Vegetable"),
            (str(uuid.uuid4())[:8],"Apples",1.10,"apple.png",156,"Fruit"),
            (str(uuid.uuid4())[:8],"Cheese",5.50,"cheese.png",86,"Dairy"),
            (str(uuid.uuid4())[:8],"Pork ribs",6.50,"pork.png",90,"Meat"),
            (str(uuid.uuid4())[:8],"Pasteurised Milk",0.73,"pasteurised milk.png",256,"Dairy"),
            (str(uuid.uuid4())[:8],"Wholegrains Mustard",0.73,"wholegrains-mustard.png",256,"Miscellaneous"),
            (str(uuid.uuid4())[:8],"Peaches",1.53,"peeches.png",131,"Fruit"),
            (str(uuid.uuid4())[:8],"pears",0.93,"pears.png",189,"Fruit"),
            (str(uuid.uuid4())[:8],"Honey",3.50,"honey.png",98,"Miscellaneous"),
            (str(uuid.uuid4())[:8],"farm Creme",1.70,"farm creme.png",196,"Miscellaneous"),
            (str(uuid.uuid4())[:8],"Eggs",1.80,"eggs.png",154,"Miscellaneous"),
            (str(uuid.uuid4())[:8],"Ground Fed Beef",10.50,"grassfedbeef.png",64,"Meat")
            
        ]

        cursor.executemany(
            "INSERT INTO products (id, name, price, image, stock, category) VALUES (?, ?, ?, ?, ?, ?)",
            products
        )

    conn.commit()
    conn.close()


#-------------Pages-------------#
@app.route('/')
def homepage():
    return render_template("homepage.html")

@app.route("/login", methods=["GET"])
def login_page():
    return render_template("login.html")

@app.route("/admin")
def admin():
    return render_template("admin.html")

@app.route("/products")
def products():
    return render_template("products.html")

@app.route("/basket")
def basket():
    return render_template("basket.html")

@app.route("/traceability")
def traceability():
    return render_template("traceability.html")

@app.route("/contactus")
def contactus():
    return render_template("contactus.html")

@app.route("/aboutus")
def aboutus():
    return render_template("aboutus.html")

@app.route("/investors")
def investors():
    return render_template("investors.html")


#-------------Register User-------------#
@app.route('/register', methods=["POST"])
def register():
    try:
        data = request.get_json()

        username = data.get("username", "").strip()
        password = data.get("password", "").strip()
        role = data.get("role", "user")

        if not username or not password:
            return jsonify({"message": "Username and password required"}), 400
        if len(password) < 6:
            return jsonify({"message": "Password must be at least 6 characters long"}), 400
        if len(password) < 6:
            return jsonify({"message": "Password must be at least 6 characters long"}), 400

        user_id = str(uuid.uuid4())[:8]

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute(
            "INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)",
            (user_id, username, password, role)
        )

        conn.commit()
        conn.close()

        return jsonify({"message": "User registered successfully"}), 201

    except Exception as e:
        return jsonify({"message": str(e)}), 500


#-------------Login System + Logger-------------#
@app.route('/login', methods=["POST"])
def login():
    try:
        data = request.get_json()

        username = data.get("username", "").strip()
        password = data.get("password", "").strip()

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute(
            "SELECT username, role FROM users WHERE username = ? AND password = ?",
            (username, password)
        )

        user = cursor.fetchone()

        if not user:
            conn.close()
            return jsonify({"message": "Invalid Login"}), 401

        found_username = user[0]
        role = user[1]

        log_id = str(uuid.uuid4())[:8]
        login_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute(
            "INSERT INTO login_logs (log_id, username, login_time) VALUES (?, ?, ?)",
            (log_id, found_username, login_time)
        )

        conn.commit()
        conn.close()

        return jsonify({
            "message": "Login Successful",
            "username": found_username,
            "role": role
        })

    except Exception as e:
        return jsonify({"message": str(e)}), 500


#-------------View Login Logs-------------#
@app.route('/logs', methods=["GET"])
def get_logs():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute("SELECT username, login_time FROM login_logs ORDER BY login_time DESC")
        logs = cursor.fetchall()

        conn.close()

        return jsonify([
            {"username": row[0], "time": row[1]}
            for row in logs
        ])

    except Exception as e:
        return jsonify({"message": str(e)}), 500


#-------------View Users-------------#
@app.route("/users", methods=["GET"])
def get_users():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute("SELECT id, username, role FROM users")
        users = cursor.fetchall()

        conn.close()

        return jsonify([
            {"id": row[0], "username": row[1], "role": row[2]}
            for row in users
        ])

    except Exception as e:
        return jsonify({"message": str(e)}), 500


#-------------Delete User-------------#
@app.route("/delete_user/<string:user_id>", methods=["DELETE"])
def delete_user(user_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute("SELECT username, role FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()

        if not user:
            conn.close()
            return jsonify({"message": "User not found"}), 404

        username, role = user

        if username == "admin" and role == "admin":
            conn.close()
            return jsonify({"message": "Main admin account cannot be deleted"}), 403

        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        conn.close()

        return jsonify({"message": "User deleted successfully"})

    except Exception as e:
        return jsonify({"message": str(e)}), 500


#-------------Add Product-------------#
@app.route("/add_product", methods=["POST"])
def add_product():
    try:
        data = request.get_json()

        name = data.get("name", "").strip()
        price = data.get("price")
        image = data.get("image", "").strip()
        stock = data.get("stock")
        category = data.get("category", "").strip()

        if not name or price is None or stock is None or not category:
            return jsonify({"message": "Name, price, stock and category are required"}), 400

        product_id = str(uuid.uuid4())[:8]

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute(
            "INSERT INTO products (id, name, price, image, stock, category) VALUES (?, ?, ?, ?, ?, ?)",
            (product_id, name, float(price), image, int(stock), category)
        )

        conn.commit()
        conn.close()

        return jsonify({"message": "Product added successfully"}), 201

    except Exception as e:
        return jsonify({"message": str(e)}), 500


#-------------View Products-------------#
@app.route("/products_data", methods=["GET"])
def products_data():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute("SELECT id, name, price, image, stock, category FROM products")
        products = cursor.fetchall()

        conn.close()

        return jsonify([
            {
                "id": row[0],
                "name": row[1],
                "price": row[2],
                "image": row[3],
                "stock": row[4],
                "category": row[5]
            }
            for row in products
        ])

    except Exception as e:
        return jsonify({"message": str(e)}), 500


#-------------Delete Product-------------#
@app.route("/delete_product/<string:product_id>", methods=["DELETE"])
def delete_product(product_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute("DELETE FROM products WHERE id = ?", (product_id,))
        conn.commit()
        conn.close()

        return jsonify({"message": "Product deleted successfully"})

    except Exception as e:
        return jsonify({"message": str(e)}), 500
#-------------Edit Product--------------#
@app.route("/update_product/<string:product_id>", methods=["PUT"])
def update_product(product_id):
    try:
        data = request.get_json()

        price = data.get("price")
        stock = data.get("stock")

        if price is None or stock is None:
            return jsonify({"message": "Price and stock are required"}), 400

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE products
            SET price = ?, stock = ?
            WHERE id = ?
        """, (float(price), int(stock), product_id))

        conn.commit()
        conn.close()

        return jsonify({"message": "Product updated successfully"})

    except Exception as e:
        return jsonify({"message": str(e)}), 500
#-------------Add To Basket-------------#
@app.route("/add_to_basket", methods=["POST"])
def add_to_basket():
    try:
        data = request.get_json()

        username = data.get("username", "").strip()
        product_id = data.get("product_id", "").strip()

        if not username or not product_id:
            return jsonify({"message": "Username and product required"}), 400

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute("SELECT stock FROM products WHERE id = ?", (product_id,))
        product = cursor.fetchone()

        if not product:
            conn.close()
            return jsonify({"message": "Product not found"}), 404

        stock = product[0]
        if stock <= 0:
            conn.close()
            return jsonify({"message": "Out of stock"}), 400

        cursor.execute(
            "SELECT basket_id, quantity FROM basket WHERE username = ? AND product_id = ?",
            (username, product_id)
        )
        existing = cursor.fetchone()

        if existing:
            basket_id, quantity = existing
            cursor.execute(
                "UPDATE basket SET quantity = ? WHERE basket_id = ?",
                (quantity + 1, basket_id)
            )
        else:
            basket_id = str(uuid.uuid4())[:8]
            cursor.execute(
                "INSERT INTO basket (basket_id, username, product_id, quantity) VALUES (?, ?, ?, ?)",
                (basket_id, username, product_id, 1)
            )

        conn.commit()
        conn.close()

        return jsonify({"message": "Added to basket"})

    except Exception as e:
        return jsonify({"message": str(e)}), 500


#-------------View Basket-------------#
@app.route("/basket_data/<string:username>", methods=["GET"])
def basket_data(username):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT basket.basket_id, products.name, products.price, basket.quantity, products.image
            FROM basket
            JOIN products ON basket.product_id = products.id
            WHERE basket.username = ?
        """, (username,))
        items = cursor.fetchall()

        conn.close()

        return jsonify([
            {
                "basket_id": row[0],
                "name": row[1],
                "price": row[2],
                "quantity": row[3],
                "image": row[4],
                "total": row[2] * row[3]
            }
            for row in items
        ])

    except Exception as e:
        return jsonify({"message": str(e)}), 500
    
#------------Update Product Quantiyy in Basket----------#
@app.route("/update_basket_quantity/<string:basket_id>", methods=["PUT"])
def update_basket_quantity(basket_id):
    try:
        data = request.get_json()
        quantity = int(data.get("quantity", 1))

        if quantity < 1:
            return jsonify({"message": "Quantity must be at least 1"}), 400

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute(
            "UPDATE basket SET quantity = ? WHERE basket_id = ?",
            (quantity, basket_id)
        )

        conn.commit()
        conn.close()

        return jsonify({"message": "Quantity updated successfully"})

    except Exception as e:
        return jsonify({"message": str(e)}), 500
    
#-------------Delete Basket Item-------------#
@app.route("/delete_basket_item/<string:basket_id>", methods=["DELETE"])
def delete_basket_item(basket_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute("DELETE FROM basket WHERE basket_id = ?", (basket_id,))
        conn.commit()
        conn.close()

        return jsonify({"message": "Basket item removed"})

    except Exception as e:
        return jsonify({"message": str(e)}), 500
    
#--------------------Specific Farm PRoduct Search--------------------#
def create_farm_table():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS farms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            product TEXT NOT NULL,
            location TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            pin_color TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def insert_sample_farms():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Prevent duplicate inserts
    cursor.execute("SELECT COUNT(*) FROM farms")
    count = cursor.fetchone()[0]

    if count == 0:
        farms = [
            ("Croxteth Park Farm", "meat", "grassfed ground beef and pork", f"liverpool,liverpool", 53.442049801166526, -2.892561361527894, "greenmarker.png"),
            ("Rice Lane City Farm", "dairy", "Paseturised milk,eggs and cheese,", f"liverpool,liverpool", 53.45484538925931, -2.9679007728338065, "yellowmarker.png"),
            ("Kindling Farm", "vegetables", "carrots,napa cabage,broccoli,bell peppers and mushrooms", f"liverpool,liverpool", 53.37900277143174, -2.8022939574950296, "redmarker.png"),
            ("Brooklet Farm", "fruit", "apples, pears, peaches and watermelons", f"Wirral,wirral", 53.33664449774066, -3.0530143100222364, "orangemarker.png"),
            ("Greenslate Community Farm", "miscellaneous", "Wholegrains Mustard, honey and farm creme", f"liverpool,liverpool", 53.53478823570839, -2.6962244707872847, "purplemarker.png"),
        ]

        cursor.executemany("""
            INSERT INTO farms (name, category, product, location, latitude, longitude, pin_color)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, farms)

    conn.commit()
    conn.close()


from flask import jsonify

@app.route("/api/farms")
def get_farms():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM farms")
    farms = cursor.fetchall()
    conn.close()

    farm_list = []
    for farm in farms:
        farm_list.append({
            "id": farm["id"],
            "name": farm["name"],
            "category": farm["category"],
            "product": farm["product"],
            "location": farm["location"],
            "lat": farm["latitude"],
            "lng": farm["longitude"],
            "pinColor": farm["pin_color"]
        })

    return jsonify(farm_list)
#-------------Runs the App------------#
create_farm_table()
insert_sample_farms()
if __name__ == "__main__":
    init_db()
    app.run(debug=True)
