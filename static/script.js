// ================= PAGE LOAD ================= //
// Runs when page loads
document.addEventListener("DOMContentLoaded", function () {
    checkLogin();              // Update account text
    updateAccountDisplay();    // Show username

    const logoutBtn = document.getElementById("logoutBtn");
    const username = localStorage.getItem("username");

    if (logoutBtn && username) {
        logoutBtn.style.display = "block";
    }

    const productsContainer = document.getElementById("productsContainer");
    if (productsContainer) {
        loadProductsFromDatabase();
    }
});


// ================= LOGIN ================= //
function loginUser() {
    // Get input fields
    const usernameElement = document.getElementById("loginUsername");
    const passwordElement = document.getElementById("loginPassword");

    // Safety check
    if (!usernameElement || !passwordElement) {
        alert("Login inputs not found.");
        return;
    }

    // Get values
    const username = usernameElement.value.trim();
    const password = passwordElement.value.trim();

    // Validate input
    if (username === "" || password === "") {
        alert("Enter username and password");
        return;
    }

    // Send login request to Flask
    fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === "Login Successful") {
            // Save login data
            localStorage.setItem("username", data.username);
            localStorage.setItem("role", data.role);

            // Redirect based on role
            if (data.role === "admin") {
                window.location.href = "/admin";
            } else {
                window.location.href = "/";
            }
        } else {
            alert(data.message);
        }
    })
    .catch(error => {
        console.error(error);
        alert("Login failed");
    });
}


// ================= REGISTER ================= //
// Show/hide register box
function toggleRegister() {
    const registerBox = document.getElementById("registerBox");

    if (!registerBox) return;

    if (registerBox.style.display === "none" || registerBox.style.display === "") {
        registerBox.style.display = "block";
    } else {
        registerBox.style.display = "none";
    }
}

// Send registration data
async function registerUser() {
    const username = document.getElementById("registerUsername")?.value.trim();
    const password = document.getElementById("registerPassword")?.value.trim();

    if (!username || !password) {
        alert("Enter username and password");
        return;
    }

    try {
        const response = await fetch("/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                password: password,
                role: "user"
            })
        });

        const result = await response.json();

        if (!response.ok) {
            alert(result.message || "Registration failed");
            return;
        }

        // auto sign in
        localStorage.setItem("username", result.username || username);
        localStorage.setItem("role", result.role || "user");
        localStorage.setItem("isLoggedIn", "true");

        alert("Registration successful. You are now signed in.");

        // hide register box if you want
        const registerBox = document.getElementById("registerBox");
        if (registerBox) {
            registerBox.style.display = "none";
        }

        // go to homepage or refresh
        window.location.href = "/";

    } catch (error) {
        console.error(error);
        alert("Registration failed");
    }
}


// ================= ACCOUNT DISPLAY ================= //
// Update header with username
function updateAccountDisplay() {
    const username = localStorage.getItem("username");

    const accountText = document.querySelector(".login-link .text");
    const accountBottomText = document.querySelector(".login-link .bottom-text");

    if (username && accountText && accountBottomText) {
        accountBottomText.textContent = "Account";
        accountText.textContent = username;
    }
}

// Wrapper
function checkLogin() {
    updateAccountDisplay();
}


// ================= ACCOUNT CLICK ================= //
// Controls what happens when user clicks account button
function handleAccountClick(event) {
    event.preventDefault();

    const role = localStorage.getItem("role");

    // Not logged in → go login page
    if (!role) {
        window.location.href = "/login";
        return;
    }

    // Admin → go admin dashboard
    if (role === "admin") {
        window.location.href = "/admin";
        return;
    }

    // Normal user → go homepage
    window.location.href = "/";
}


// ================= ADMIN DASHBOARD ================= //
function viewProductsAdmin() {
    const role = localStorage.getItem("role");

    if (role !== "admin") {
        alert("Access denied. Admin only.");
        return;
    }

    fetch("/products_data")
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById("adminProductsContainer");

            if (!container) return;

            if (data.length === 0) {
                container.innerHTML = "<p>No products found.</p>";
                return;
            }

            let html = `
                <table class="admin-products-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Price</th>
                            <th>Image</th>
                            <th>Stock</th>
                            <th>Category</th>
                            <th>Amount</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            data.forEach(product => {
                html += `
                    <tr>
                        <td>${product.id}</td>
                        <td>${product.name}</td>
                        <td>
                            <input 
                                type="number" 
                                step="0.01" 
                                min="0" 
                                id="price-${product.id}" 
                                value="${Number(product.price).toFixed(2)}"
                            >
                        </td>
                        <td>${product.image || "-"}</td>
                        <td>
                            <input 
                                type="number" 
                                min="0" 
                                id="stock-${product.id}" 
                                value="${product.stock}"
                            >
                        </td>
                        <td>${product.category || "-"}</td>
                        <td>£${(Number(product.price) * Number(product.stock)).toFixed(2)}</td>
                        <td>
                            <button type="button" onclick="updateProductAdmin('${product.id}')">Save</button>
                            <button type="button" onclick="deleteProduct('${product.id}', '${product.name}')">Delete</button>
                        </td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            `;

            container.innerHTML = html;
        })
        .catch(error => {
            console.error(error);
            const container = document.getElementById("adminProductsContainer");
            if (container) {
                container.innerHTML = "<p>Could not load products.</p>";
            }
        });
}
//-------------Update Product As Admin-------------//
function updateProductAdmin(productId) {
    const role = localStorage.getItem("role");

    if (role !== "admin") {
        alert("Access denied. Admin only.");
        return;
    }

    const priceInput = document.getElementById(`price-${productId}`);
    const stockInput = document.getElementById(`stock-${productId}`);

    if (!priceInput || !stockInput) {
        alert("Could not find product inputs.");
        return;
    }

    const price = parseFloat(priceInput.value);
    const stock = parseInt(stockInput.value);

    if (isNaN(price) || isNaN(stock)) {
        alert("Enter valid price and stock values.");
        return;
    }

    if (price < 0 || stock < 0) {
        alert("Price and stock cannot be negative.");
        return;
    }

    fetch(`/update_product/${productId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            price: price,
            stock: stock
        })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        viewProductsAdmin(); // reload table after update
    })
    .catch(error => {
        console.error(error);
        alert("Could not update product.");
    });
}

// Load users into table
function viewUsers() {
    const role = localStorage.getItem("role");

    // Block non-admin
    if (role !== "admin") {
        alert("Access denied. Admin only.");
        return;
    }

    fetch("/users")
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById("adminContent");
            if (!container) return;

            let html = `
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Username</th>
                            <th>Role</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            data.forEach(user => {
                html += `
                    <tr>
                        <td>${user.id}</td>
                        <td>${user.username}</td>
                        <td>${user.role}</td>
                        <td>
                            <button class="delete-btn" onclick="deleteUser('${user.id}', '${user.username}')">
                                Delete
                            </button>
                        </td>
                    </tr>
                `;
            });

            html += `</tbody></table>`;
            container.innerHTML = html;
        })
        .catch(error => {
            console.error(error);
            const container = document.getElementById("adminContent");
            if (container) {
                container.innerHTML = `<div class="admin-empty">Could not load users.</div>`;
            }
        });
}

// Load login logs into table
function openAdminPanel() {
    const role = localStorage.getItem("role");

    if (role !== "admin") {
        alert("Access denied. Admin only.");
        return;
    }

    fetch("/logs")
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById("adminContent");
            if (!container) return;

            let html = `
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Login Time</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            data.forEach(log => {
                html += `
                    <tr>
                        <td>${log.username}</td>
                        <td>${log.time}</td>
                    </tr>
                `;
            });

            html += `</tbody></table>`;
            container.innerHTML = html;
        })
        .catch(() => {
            const container = document.getElementById("adminContent");
            if (container) {
                container.innerHTML = `<div class="admin-empty">Error loading admin data.</div>`;
            }
        });
}

// Delete user
function deleteUser(userId, username) {
    const role = localStorage.getItem("role");

    if (role !== "admin") {
        alert("Access denied. Admin only.");
        return;
    }

    const confirmDelete = confirm(`Are you sure you want to delete ${username}?`);

    if (!confirmDelete) {
        return;
    }

    fetch(`/delete_user/${userId}`, {
        method: "DELETE"
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        viewUsers(); // reload table after delete
    })
    .catch(error => {
        console.error(error);
        alert("Could not delete user.");
    });
}


// ================= LOGOUT ================= //
function logoutUser() {
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    window.location.href = "/";
}


// ================= PRODUCTS ================= //

let allProducts = [];

// Load all products for users from database
function loadProductsFromDatabase() {
    fetch("/products_data")
        .then(response => response.json())
        .then(data => {
            allProducts = data;
            updateCategoryCounts();
            renderProducts();
        })
        .catch(error => {
            console.error(error);
            const container = document.getElementById("productsContainer");
            if (container) {
                container.innerHTML = "<p>Could not load products.</p>";
            }
        });
}

// Render products with search + category filter
function renderProducts() {
    const container = document.getElementById("productsContainer");
    if (!container) return;

    const searchInput = document.getElementById("searchInput");
    const categorySelect = document.getElementById("categorySelect");

    const searchValue = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const selectedCategory = categorySelect ? categorySelect.value : "All";

    let filteredProducts = allProducts.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchValue);
        const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (filteredProducts.length === 0) {
        container.innerHTML = "<p>No products found.</p>";
        return;
    }

    let html = "";

    filteredProducts.forEach(product => {
        html += `
            <div class="product-card">
                <img src="/static/${product.image}" class="product-img" alt="${product.name}">
                <button type="button" class="add-btn" onclick="addToBasket('${product.id}')">Add +</button>
                <h3>${product.name}</h3>
                <p>£${Number(product.price).toFixed(2)} /kg</p>
                <p>Available: ${product.stock}</p>
                <p class="product-category-label">${product.category}</p>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ----------- CONTACT FORM MESSAGE ----------- //
function sendContactMessage() {
    const name = document.querySelector(".contact-form-box input[type='text']")?.value.trim();
    const email = document.querySelector(".contact-form-box input[type='email']")?.value.trim();
    const message = document.querySelector(".contact-form-box textarea")?.value.trim();

    if (!name || !email || !message) {
        showContactPopup("Please fill in all fields.");
        return;
    }

    // Show success popup
    showContactPopup("Message sent successfully!");

    // Clear form
    document.querySelector(".contact-form-box input[type='text']").value = "";
    document.querySelector(".contact-form-box input[type='email']").value = "";
    document.querySelector(".contact-form-box textarea").value = "";
}
function showContactPopup(text) {
    const msg = document.getElementById("contactMessage");
    if (!msg) return;

    // Move to body so it’s not stuck in layout
    document.body.appendChild(msg);

    msg.textContent = text;

    msg.style.position = "fixed";
    msg.style.bottom = "20px";
    msg.style.left = "50%";
    msg.style.transform = "translateX(-50%)";
    msg.style.background = "#04992f";
    msg.style.color = "white";
    msg.style.padding = "12px 20px";
    msg.style.borderRadius = "10px";
    msg.style.boxShadow = "4px 4px 8px #00000055";
    msg.style.zIndex = "9999";
    msg.style.display = "block";
    msg.style.fontWeight = "bold";

    setTimeout(() => {
        msg.style.display = "none";
    }, 2000);
}

// Product List search function
function searchProducts() {
    renderProducts();
}

// Update active filter tag
function updateFilterTag() {
    const categorySelect = document.getElementById("categorySelect");
    const activeFilterText = document.getElementById("activeFilterText");

    if (categorySelect && activeFilterText) {
        activeFilterText.textContent = categorySelect.value;
    }

    renderProducts();
}

// Add product to basket
function addToBasket(productId) {
    const username = localStorage.getItem("username");
    const role = localStorage.getItem("role");

    if (!username || role === "admin") {
        alert("Log in as a user to add to basket.");
        return;
    }

    fetch("/add_to_basket", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username,
            product_id: productId
        })
    })
    .then(response => response.json())
    .then(data => {
    const msg = document.getElementById("addMessage");
    if (msg) {
        // 1. Move the element to the end of the body so it's not trapped in a container
        document.body.appendChild(msg);

        // 2. Apply the "Extreme" styles via JS to ensure they override everything
        msg.style.position = "fixed";
        msg.style.zIndex = "2147483647"; 
        msg.style.display = "block";
        msg.textContent = "Added to basket";

        // 3. Hide it after 1.5 seconds
        setTimeout(() => {
            msg.style.display = "none";
        }, 1500);
    }
    })
    .catch(error => {
        console.error(error);
        alert("Could not add to basket.");
    });
}
// ----------Product add---------------//
function addProduct() {
    const role = localStorage.getItem("role");

    if (role !== "admin") {
        alert("Access denied. Admin only.");
        return;
    }

    const name = document.getElementById("productName")?.value.trim();
    const price = document.getElementById("productPrice")?.value.trim();
    const image = document.getElementById("productImage")?.value.trim();
    const stock = document.getElementById("productStock")?.value.trim();
    const category = document.getElementById("productCategory")?.value.trim();

    if (!name || !price || !stock || !category) {
        alert("Enter name, price, stock and category");
        return;
    }

    fetch("/add_product", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: name,
            price: price,
            image: image,
            stock: stock,
            category: category
        })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);

        document.getElementById("productName").value = "";
        document.getElementById("productPrice").value = "";
        document.getElementById("productImage").value = "";
        document.getElementById("productStock").value = "";
        document.getElementById("productCategory").value = "";

        viewProductsAdmin();
    })
    .catch(error => {
        console.error(error);
        alert("Could not add product.");
    });
}

// ================= BASKET ================= //

// Load basket for logged in user
function loadBasket() {
    const username = localStorage.getItem("username");
    const role = localStorage.getItem("role");

    const container = document.getElementById("basketContainer");
    if (!container) return;

    if (!username || role === "admin") {
        container.innerHTML = "<p>Log in as a user to view basket.</p>";
        return;
    }

    fetch(`/basket_data/${username}`)
        .then(response => response.json())
        .then(data => {
            if (data.length === 0) {
                container.innerHTML = "<p>Your basket is empty.</p>";
                return;
            }

            let totalPrice = 0;

            let html = `
                <table class="basket-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Price</th>
                            <th>Quantity</th>
                            <th>Total</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            data.forEach(item => {
                totalPrice += item.total;

                html += `
                    <tr>
                        <td>${item.name}</td>
                        <td>£${Number(item.price).toFixed(2)}</td>
                        <td>${item.quantity}</td>
                        <td>£${Number(item.total).toFixed(2)}</td>
                        <td>
                            <button type="button" onclick="removeBasketItem('${item.basket_id}')">Remove</button>
                        </td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
                <h3>Total Basket Price: £${Number(totalPrice).toFixed(2)}</h3>
            `;

            container.innerHTML = html;
        })
        .catch(error => {
            console.error(error);
            container.innerHTML = "<p>Could not load basket.</p>";
        });
}


// Remove basket item
function loadBasket() {
    const username = localStorage.getItem("username");
    const role = localStorage.getItem("role");

    const container = document.getElementById("basketContainer");
    const totalElement = document.getElementById("basketGrandTotal");

    if (!container) return;

    if (!username || role === "admin") {
        container.innerHTML = "<p>Log in as a user to view basket.</p>";
        if (totalElement) totalElement.textContent = "£0.00";
        return;
    }
    
    fetch(`/basket_data/${username}`)
        .then(response => response.json())
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                container.innerHTML = "<p>Your basket is empty.</p>";
                if (totalElement) totalElement.textContent = "£0.00";
                return;
            }

            let totalPrice = 0;

            let html = `
                <table class="basket-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Subtotal</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            data.forEach(item => {
                totalPrice += Number(item.total);

                html += `
                    <tr>
                        <td>
                            <img src="/static/${item.image}" alt="${item.name}" class="basket-product-img">
                            ${item.name}
                        </td>
                        <td>${item.quantity}</td>
                        <td>£${Number(item.price).toFixed(2)}</td>
                        <td>£${Number(item.total).toFixed(2)}</td>
                        <td>
                            <button type="button" onclick="removeBasketItem('${item.basket_id}')">Remove</button>
                        </td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            `;

            container.innerHTML = html;

            if (totalElement) {
                totalElement.textContent = `£${totalPrice.toFixed(2)}`;
            }
        })
        .catch(error => {
            console.error(error);
            container.innerHTML = "<p>Could not load basket.</p>";
            if (totalElement) totalElement.textContent = "£0.00";
        });
}

function removeBasketItem(basketId) {
    fetch(`/delete_basket_item/${basketId}`, {
        method: "DELETE"
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        loadBasket();
    })
    .catch(error => {
        console.error(error);
        alert("Could not remove basket item.");
    });
}


// ================= ADMIN PRODUCTS ================= //

// Load products for admin table
function loadBasket() {
    const username = localStorage.getItem("username");
    const role = localStorage.getItem("role");

    const container = document.getElementById("basketContainer");
    const totalElement = document.getElementById("basketGrandTotal");

    if (!container) return;

    if (!username || role === "admin") {
        container.innerHTML = "<p>Log in as a user to view basket.</p>";
        if (totalElement) totalElement.textContent = "£0.00";
        return;
    }

    fetch(`/basket_data/${username}`)
        .then(response => response.json())
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                container.innerHTML = "<p>Your basket is empty.</p>";
                if (totalElement) totalElement.textContent = "£0.00";
                return;
            }

            let totalPrice = 0;

            let html = `
                <table class="basket-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Subtotal</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            data.forEach(item => {
                totalPrice += Number(item.total);

                html += `
                    <tr>
                        <td class="basket-product-cell">
                            <img src="/static/${item.image}" alt="${item.name}" class="basket-product-img">
                            <span class="basket-product-name">${item.name}</span>
                        </td>
                        <td>
                            <div class="basket-quantity-wrap">
                                <input 
                                    type="number" 
                                    min="1" 
                                    value="${item.quantity}" 
                                    class="basket-quantity-input"
                                    id="qty-${item.basket_id}"
                                >
                                <button 
                                    type="button" 
                                    class="basket-update-btn"
                                    onclick="updateBasketQuantity('${item.basket_id}')"
                                >
                                    Update
                                </button>
                            </div>
                        </td>
                        <td>£${Number(item.price).toFixed(2)}</td>
                        <td>£${Number(item.total).toFixed(2)}</td>
                        <td>
                            <button 
                                type="button" 
                                class="basket-remove-btn" 
                                onclick="removeBasketItem('${item.basket_id}')"
                            >
                                Remove
                            </button>
                        </td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            `;

            container.innerHTML = html;

            if (totalElement) {
                totalElement.textContent = `£${totalPrice.toFixed(2)}`;
            }
        })
        .catch(error => {
            console.error(error);
            container.innerHTML = "<p>Could not load basket.</p>";
            if (totalElement) totalElement.textContent = "£0.00";
        });
}

function updateBasketQuantity(basketId) {
    const input = document.getElementById(`qty-${basketId}`);
    if (!input) return;

    const quantity = parseInt(input.value);

    if (isNaN(quantity) || quantity < 1) {
        alert("Quantity must be 1 or more.");
        return;
    }

    fetch(`/update_basket_quantity/${basketId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            quantity: quantity
        })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        loadBasket();
    })
    .catch(error => {
        console.error(error);
        alert("Could not update quantity.");
    });
}

function removeBasketItem(basketId) {
    fetch(`/delete_basket_item/${basketId}`, {
        method: "DELETE"
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        loadBasket();
    })
    .catch(error => {
        console.error(error);
        alert("Could not remove basket item.");
    });
}
//-----Category filter------//
function updateCategoryCounts() {
    const counts = {
        Vegetable: 0,
        Fruit: 0,
        Dairy: 0,
        Meat: 0,
        Miscellaneous: 0
    };

    allProducts.forEach(product => {
        if (counts.hasOwnProperty(product.category)) {
            counts[product.category]++;
        }
    });

    const vegCount = document.getElementById("vegCount");
    const fruitCount = document.getElementById("fruitCount");
    const dairyCount = document.getElementById("dairyCount");
    const meatCount = document.getElementById("meatCount");
    const miscCount = document.getElementById("miscCount");

    if (vegCount) vegCount.textContent = counts.Vegetable;
    if (fruitCount) fruitCount.textContent = counts.Fruit;
    if (dairyCount) dairyCount.textContent = counts.Dairy;
    if (meatCount) meatCount.textContent = counts.Meat;
    if (miscCount) miscCount.textContent = counts.Miscellaneous;
}
function setCategoryFilter(categoryValue, displayText) {
    const activeFilterText = document.getElementById("activeFilterText");

    const allBoxes = [
        "catVegetables",
        "catFruit",
        "catDairy",
        "catMeat",
        "catMisc"
    ];

    allBoxes.forEach(id => {
        const box = document.getElementById(id);
        if (box) box.checked = false;
    });

    if (categoryValue === "Vegetable") {
        document.getElementById("catVegetables").checked = true;
    } else if (categoryValue === "Fruit") {
        document.getElementById("catFruit").checked = true;
    } else if (categoryValue === "Dairy") {
        document.getElementById("catDairy").checked = true;
    } else if (categoryValue === "Meat") {
        document.getElementById("catMeat").checked = true;
    } else if (categoryValue === "Miscellaneous") {
        document.getElementById("catMisc").checked = true;
    }

    if (activeFilterText) {
        activeFilterText.textContent = displayText;
    }

    renderProductsByCategory(categoryValue);
}
//----Clears Product Category ---//
function clearCategoryFilter() {
    const activeFilterText = document.getElementById("activeFilterText");

    const allBoxes = [
        "catVegetables",
        "catFruit",
        "catDairy",
        "catMeat",
        "catMisc"
    ];

    allBoxes.forEach(id => {
        const box = document.getElementById(id);
        if (box) box.checked = false;
    });

    if (activeFilterText) {
        activeFilterText.textContent = "All";
    }

    renderProductsByCategory("All");
}
//--Product Render By Category-----//
function renderProductsByCategory(categoryValue) {
    const container = document.getElementById("productsContainer");
    const searchInput = document.getElementById("searchInput");
    const searchValue = searchInput ? searchInput.value.toLowerCase().trim() : "";

    if (!container) return;

    let filteredProducts = allProducts.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchValue);
        const matchesCategory = categoryValue === "All" || product.category === categoryValue;
        return matchesSearch && matchesCategory;
    });

    if (filteredProducts.length === 0) {
        container.innerHTML = "<p>No products found.</p>";
        return;
    }

    let html = "";

    filteredProducts.forEach(product => {
        html += `
            <div class="product-card">
                <img src="/static/${product.image}" class="product-img" alt="${product.name}">
                <button type="button" class="add-btn" onclick="addToBasket('${product.id}')">Add +</button>
                <h3>${product.name}</h3>
                <p>£${Number(product.price).toFixed(2)} /kg</p>
                <p>Available: ${product.stock}</p>
                <p class="product-category-label">${product.category}</p>
            </div>
        `;
    });

    container.innerHTML = html;
    
}


// Delete product as admin
function deleteProduct(productId, productName) {
    const role = localStorage.getItem("role");

    if (role !== "admin") {
        alert("Access denied. Admin only.");
        return;
    }

    const confirmDelete = confirm(`Delete product ${productName}?`);
    if (!confirmDelete) return;

    fetch(`/delete_product/${productId}`, {
        method: "DELETE"
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        viewProductsAdmin();
    })
    .catch(error => {
        console.error(error);
        alert("Could not delete product.");
    });
}

document.addEventListener("DOMContentLoaded", async () => {
  const mapElement = document.getElementById("farmMap");
  if (!mapElement) return;

  const map = L.map("farmMap").setView([53.2, -1.5], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 15,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  function createIcon(fileName) {
    return L.icon({
      iconUrl: "/static/" + fileName,
      iconSize: [30, 40],
      iconAnchor: [15, 40],
      popupAnchor: [0, -35]
    });
  }

  let farms = [];
  let farmLatLngs = [];
  const markers = [];

  async function loadFarmData() {
    try {
      const response = await fetch("/api/farms");

      if (!response.ok) {
        throw new Error("Failed to load farm data");
      }

      farms = await response.json();

      // Make values safe for searching
      farms = farms.map(farm => ({
        ...farm,
        name: String(farm.name || ""),
        category: String(farm.category || "").toLowerCase(),
        product: String(farm.product || "").toLowerCase(),
        location: String(farm.location || "").toLowerCase(),
        pinColor: String(farm.pinColor || farm.pin_color || "greenmarker.png"),
        lat: parseFloat(farm.lat ?? farm.latitude),
        lng: parseFloat(farm.lng ?? farm.longitude)
      }));

      farmLatLngs = farms
        .filter(farm => !isNaN(farm.lat) && !isNaN(farm.lng))
        .map(farm => [farm.lat, farm.lng]);

    } catch (error) {
      console.error("Error loading farms:", error);
      alert("Failed to load farm data");
    }
  }

  function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers.length = 0;
  }

  function drawMarkers(farmList) {
    clearMarkers();

    farmList.forEach(farm => {
      if (isNaN(farm.lat) || isNaN(farm.lng)) return;

      const marker = L.marker([farm.lat, farm.lng], {
        icon: createIcon(farm.pinColor)
      })
        .addTo(map)
        .bindPopup(`
          <strong>${farm.name}</strong><br>
          Product: ${farm.product}<br>
          Category: ${farm.category}<br>
          Location: ${farm.location}
        `);

      marker.farmData = farm;
      markers.push(marker);
    });

    if (farmList.length > 0) {
      const bounds = farmList
        .filter(farm => !isNaN(farm.lat) && !isNaN(farm.lng))
        .map(farm => [farm.lat, farm.lng]);

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    }
  }

  const productInput = document.querySelector(".traceability-search-input");
  const locationInput = document.querySelector(".traceability-location-input");
  const categoryDropdown = document.querySelector(".traceability-category-dropdown");
  const searchBtn = document.querySelector(".traceability-search-btn");
  const clearBtn = document.querySelector(".traceability-clear-btn");

  function renderFarmList(filteredFarms) {
    const farmItems = document.querySelectorAll(".traceability-farm-item");

    farmItems.forEach((item, index) => {
      if (filteredFarms[index]) {
        item.style.display = "flex";
        const span = item.querySelector("span");
        if (span) span.textContent = filteredFarms[index].name;
      } else {
        item.style.display = "none";
      }
    });
  }

  function runFarmSearch() {
    const productText = productInput ? productInput.value.trim().toLowerCase() : "";
    const locationText = locationInput ? locationInput.value.trim().toLowerCase() : "";
    const selectedCategory = categoryDropdown ? categoryDropdown.value.trim().toLowerCase() : "";

    let filteredFarms = farms;

    // text bar = product
    if (productText) {
      filteredFarms = filteredFarms.filter(farm =>
        farm.product.includes(productText)
      );
    }

    // dropdown = category
    if (selectedCategory) {
      filteredFarms = filteredFarms.filter(farm =>
        farm.category === selectedCategory
      );
    }

    // location box = location or farm name
    if (locationText) {
      filteredFarms = filteredFarms.filter(farm =>
        farm.location.includes(locationText) ||
        farm.name.toLowerCase().includes(locationText)
      );
    }

    drawMarkers(filteredFarms);
    renderFarmList(filteredFarms);
  }

  function clearFarmSearch() {
    if (productInput) productInput.value = "";
    if (locationInput) locationInput.value = "";
    if (categoryDropdown) categoryDropdown.value = "";

    drawMarkers(farms);
    renderFarmList(farms);

    if (farmLatLngs.length > 0) {
      map.fitBounds(farmLatLngs, { padding: [30, 30] });
    }
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", runFarmSearch);
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", clearFarmSearch);
  }

  await loadFarmData();
  drawMarkers(farms);
  renderFarmList(farms);

  setTimeout(() => {
    map.invalidateSize();
  }, 100);
});

//---checkout section---//
function checkout() {
  document.getElementById("checkoutPopup").style.display = "block";
}

function closeCheckout() {
  document.getElementById("checkoutPopup").style.display = "none";
}
//---------Farm Booking System ------------//
let selectedFarmName = "";

function bookFarmer(farmName) {
  selectedFarmName = farmName;
  document.getElementById("bookingFarmTitle").textContent = "Book a Visit - " + farmName;
  document.getElementById("bookingPopup").style.display = "block";
}

function closeBookingPopup() {
  document.getElementById("bookingPopup").style.display = "none";
}

function submitBooking() {
  const name = document.getElementById("visitorName").value.trim();
  const email = document.getElementById("visitorEmail").value.trim();
  const date = document.getElementById("visitDate").value;
  const message = document.getElementById("visitMessage").value.trim();

  if (!name || !email || !date) {
    alert("Please fill in your name, email, and preferred date.");
    return;
  }

  alert(
    "Booking confirmed!\n\n" +
    "Farm: " + selectedFarmName + "\n" +
    "Name: " + name + "\n" +
    "Email: " + email + "\n" +
    "Date: " + date
  );

  document.getElementById("visitorName").value = "";
  document.getElementById("visitorEmail").value = "";
  document.getElementById("visitDate").value = "";
  document.getElementById("visitMessage").value = "";

  closeBookingPopup();
}
