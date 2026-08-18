// ==========================================
// RIDEMITRA - COMPLETE SYSTEM SCRIPT
// ==========================================

// ==========================================
// RIDEMITRA - AUTHENTICATION SYSTEM
// ==========================================

function getCurrentUser() {

    const userData =
        localStorage.getItem(RIDEMITRA_CONFIG.STORAGE.USER) ||
        localStorage.getItem(RIDEMITRA_CONFIG.STORAGE.LEGACY_USER);

    if (!userData) {
        return null;
    }

    try {
        return JSON.parse(userData);
    } catch (error) {
        console.error("User data error:", error);
        return null;
    }
}


// ==========================================
// SAVE USER
// ==========================================

function saveLoggedInUser(user) {

    localStorage.setItem(
        RIDEMITRA_CONFIG.STORAGE.USER,
        JSON.stringify(user)
    );

    // Keep old system compatible
    localStorage.setItem(
        RIDEMITRA_CONFIG.STORAGE.LEGACY_USER,
        JSON.stringify(user)
    );

    localStorage.setItem(
        RIDEMITRA_CONFIG.STORAGE.LOGGED_IN,
        "true"
    );
}


// ==========================================
// LOGIN
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    const loginForm =
        document.getElementById("loginForm");

    if (!loginForm) {
        return;
    }


    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();


        const emailInput =
            document.getElementById("loginEmail");

        const passwordInput =
            document.getElementById("loginPassword");


        const email =
            emailInput.value.trim().toLowerCase();

        const password =
            passwordInput.value;


        let message =
            document.getElementById("loginMessage");


        // Create message element automatically
        if (!message) {

            message =
                document.createElement("p");

            message.id = "loginMessage";

            message.style.marginTop = "15px";
            message.style.textAlign = "center";

            loginForm.appendChild(message);
        }


        if (!email || !password) {

            message.style.color = "#dc3545";
            message.textContent =
                "Please enter email and password.";

            return;
        }


        message.style.color = "#64748b";
        message.textContent =
            "Checking your account...";


        const submitButton =
            loginForm.querySelector(
                'button[type="submit"]'
            );


        if (submitButton) {
            submitButton.disabled = true;
            submitButton.style.opacity = "0.7";
        }


        try {

            const response = await fetch(
                apiUrl(
                    RIDEMITRA_CONFIG.API.LOGIN
                ),
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                }
            );


            const data =
                await response.json();


            if (!response.ok || !data.success) {

                message.style.color = "#dc3545";

                message.textContent =
                    data.message ||
                    "Invalid email or password.";

                return;
            }


            // Save user
            saveLoggedInUser(data.user);


            message.style.color = "#198754";

            message.textContent =
                "✓ Login successful. Opening Dashboard...";


            setTimeout(function () {

                window.location.href =
                    "dashboard.html";

            }, 700);


        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            message.style.color =
                "#dc3545";

            message.textContent =
                "Unable to connect to RideMitra server. Please start app.py.";

        } finally {

            if (submitButton) {

                submitButton.disabled = false;
                submitButton.style.opacity = "1";
            }
        }

    });

});

// Current Logged-in User Data Fetch (Helper Function)
function getCurrentUser() {
    const userData = localStorage.getItem("rm_current_user") || localStorage.getItem("rideMitraUser");
    return userData ? JSON.parse(userData) : null;
}

// ---------- SIDEBAR & NAVIGATION TOGGLE ----------
// =========================================================
// RIDEMITRA - GLOBAL SIDEBAR TOGGLE
// =========================================================

document.addEventListener("DOMContentLoaded", function () {

    const menuToggle = document.getElementById("menuToggle");
    const sideNav = document.getElementById("sideNav");
    const mainLayout = document.querySelector(".main-layout");

    if (!menuToggle || !sideNav) {
        return;
    }


    function updateMenuIcon() {

        const icon = menuToggle.querySelector("i");

        if (!icon) {
            return;
        }

        const isMobile =
            window.innerWidth <= 992;

        if (isMobile) {

            const isOpen =
                sideNav.classList.contains("active");

            icon.className = isOpen
                ? "fa-solid fa-xmark"
                : "fa-solid fa-bars";

        } else {

            const isClosed =
                sideNav.classList.contains("closed");

            icon.className = isClosed
                ? "fa-solid fa-bars"
                : "fa-solid fa-xmark";
        }
    }


    menuToggle.addEventListener("click", function (event) {

        event.preventDefault();
        event.stopPropagation();

        const isMobile =
            window.innerWidth <= 992;


        if (isMobile) {

            sideNav.classList.toggle("active");

        } else {

            sideNav.classList.toggle("closed");

            if (mainLayout) {
                mainLayout.classList.toggle("full-width");
            }
        }

        updateMenuIcon();
    });


    /* Close mobile sidebar when clicking a navigation link */

    sideNav.querySelectorAll("a").forEach(function (link) {

        link.addEventListener("click", function () {

            if (window.innerWidth <= 992) {

                sideNav.classList.remove("active");

                updateMenuIcon();
            }

        });

    });


    /* Keep state correct when resizing browser */

    window.addEventListener("resize", function () {

        if (window.innerWidth > 992) {

            sideNav.classList.remove("active");

        } else {

            sideNav.classList.remove("closed");

            if (mainLayout) {
                mainLayout.classList.remove("full-width");
            }
        }

        updateMenuIcon();
    });


    updateMenuIcon();

});
// Dynamic User Header Setup
const userArea = document.getElementById("userArea");
const currentUser = getCurrentUser();

if (userArea) {
    if (currentUser) {
        userArea.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-weight: 600;">👋 ${currentUser.name || "User"}</span>
                    <button type="button" id="logoutBtn" class="btn secondary">Logout</button>
                </div>
            `;
        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", function () {
                localStorage.removeItem("rm_current_user");
                localStorage.removeItem("rideMitraUser");
                localStorage.removeItem("rideMitraLoggedIn");
                window.location.href = "login.html";
            });
        }
    }
}

// ---------- PUBLISH RIDE ----------
const rideForm = document.getElementById("rideForm");

if (rideForm) {
    rideForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const currentUser = getCurrentUser();

        if (!currentUser) {
            alert("⚠️ Please login first to publish a ride!");
            window.location.href = "login.html";
            return;
        }

        const driverName = document.getElementById("driverName") ? document.getElementById("driverName").value.trim() : currentUser.name;
        const from = document.getElementById("rideFrom").value.trim();
        const to = document.getElementById("rideTo").value.trim();
        const date = document.getElementById("rideDate").value;
        const time = document.getElementById("rideTime").value;
        const seats = Number(document.getElementById("rideSeats").value);
        const price = Number(document.getElementById("ridePrice").value);
        const vehicle = document.getElementById("vehicle").value.trim();

        const ride = {
            driver_id: currentUser.user_id || currentUser.id || 1,
            from: from,
            to: to,
            date: date,
            time: time,
            seats: seats,
            price: price,
            vehicle: vehicle
        };

        try {
            const response = await fetch("http://127.0.0.1:5000/api/rides", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(ride)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                alert("🎉 Ride published successfully!");
                window.location.href = "find-ride.html";
            } else {
                alert("❌ Ride publish failed: " + (result.message || "Something went wrong"));
            }

        } catch (error) {
            console.error("Publish Ride Error:", error);
            alert("❌ Backend server se connection nahi ho paya.");
        }
    });
}

// ---------- DISPLAY RIDES ----------
const publishedRideContainer = document.getElementById("publishedRide");

if (publishedRideContainer) {
    displayRides();
}

async function displayRides() {
    publishedRideContainer.innerHTML = `
        <div class="no-rides">
            <p>🔄 Loading rides...</p>
        </div>
    `;

    try {
        const response = await fetch("http://127.0.0.1:5000/api/rides");

        if (!response.ok) {
            throw new Error("Failed to fetch rides");
        }

        const rides = await response.json();
        publishedRideContainer.innerHTML = "";

        if (!rides || rides.length === 0) {
            publishedRideContainer.innerHTML = `
                <div class="no-rides">
                    <h3>🚗 No rides available</h3>
                    <p>No one has published a ride yet. Try offering a ride!</p>
                </div>
            `;
            return;
        }

        rides.forEach(function (ride) {
            const rideCard = document.createElement("div");
            rideCard.className = "ride-card";

            rideCard.setAttribute("data-from", ride.from_location || ride.from || "");
            rideCard.setAttribute("data-to", ride.destination || ride.to || "");
            rideCard.setAttribute("data-date", ride.travel_date || ride.date || "");

            const availableSeats = ride.available_seats !== undefined ? ride.available_seats : ride.seats;

            rideCard.innerHTML = `
                <div class="ride-info">
                    <h3>🚗 ${ride.from_location || ride.from} → ${ride.destination || ride.to}</h3>
                    <p><strong>Driver:</strong> ${ride.driver_name || "Driver"}</p>
                    <p><strong>Date:</strong> ${ride.travel_date || ride.date}</p>
                    <p><strong>Departure:</strong> ${ride.departure_time || ride.time}</p>
                    <p><strong>Available Seats:</strong> ${availableSeats}</p>
                    <p><strong>Vehicle:</strong> ${ride.vehicle}</p>
                </div>

                <div class="ride-price">
                    <h3>₹${ride.price_per_seat || ride.price}</h3>
                    <p>per seat</p>
                    <button class="btn primary view-ride-btn" type="button" ${availableSeats <= 0 ? "disabled" : ""}>
                        ${availableSeats <= 0 ? "Fully Booked" : "View Ride"}
                    </button>
                </div>
            `;

            publishedRideContainer.appendChild(rideCard);

            const viewButton = rideCard.querySelector(".view-ride-btn");

            viewButton.addEventListener("click", async function () {
                const currentUser = getCurrentUser();

                if (!currentUser) {
                    alert("⚠️ Please login first to book a ride!");
                    window.location.href = "login.html";
                    return;
                }

                const confirmJoin = confirm(
                    `🚗 ${ride.from_location || ride.from} → ${ride.destination || ride.to}\n\n` +
                    `👤 Driver: ${ride.driver_name || "Driver"}\n` +
                    `📅 Date: ${ride.travel_date || ride.date}\n` +
                    `🕘 Departure: ${ride.departure_time || ride.time}\n` +
                    `💺 Available Seats: ${availableSeats}\n` +
                    `🚘 Vehicle: ${ride.vehicle}\n` +
                    `💰 Price: ₹${ride.price_per_seat || ride.price} per seat\n\n` +
                    `Do you want to join this ride?`
                );

                if (!confirmJoin) return;

                if (availableSeats <= 0) {
                    alert("❌ Sorry, no seats are available.");
                    return;
                }

                try {
                    const response = await fetch("http://127.0.0.1:5000/api/bookings", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            ride_id: ride.ride_id || ride.id,
                            passenger_id: currentUser.user_id || currentUser.id,
                            seats_booked: 1
                        })
                    });

                    const result = await response.json();

                    if (!response.ok || !result.success) {
                        alert("❌ " + (result.message || "Unable to join ride."));
                        return;
                    }

                    alert("🎉 Ride joined successfully!");
                    displayRides();

                } catch (error) {
                    console.error("Join ride error:", error);
                    alert("❌ Backend server se connection nahi ho paya.");
                }
            });
        });

    } catch (error) {
        console.error("Error loading rides:", error);
        publishedRideContainer.innerHTML = `
            <div class="no-rides">
                <h3>❌ Unable to load rides</h3>
                <p>Please make sure the backend server is running.</p>
            </div>
        `;
    }
}

// ---------- SEARCH RIDE ----------
const searchButton = document.getElementById("searchButton");

if (searchButton) {
    searchButton.addEventListener("click", searchRides);
}

function searchRides() {
    const fromInput = document.getElementById("fromLocation");
    const toInput = document.getElementById("toLocation");
    const dateInput = document.getElementById("travelDate");

    const from = fromInput ? fromInput.value.trim().toLowerCase() : "";
    const to = toInput ? toInput.value.trim().toLowerCase() : "";
    const date = dateInput ? dateInput.value : "";

    const rides = document.querySelectorAll("#publishedRide .ride-card");
    let found = false;

    rides.forEach(function (ride) {
        const rideFrom = (ride.getAttribute("data-from") || "").trim().toLowerCase();
        const rideTo = (ride.getAttribute("data-to") || "").trim().toLowerCase();
        const rawDate = ride.getAttribute("data-date") || "";

        let rideDate = rawDate;
        if (rawDate.includes("T")) {
            rideDate = rawDate.split("T")[0];
        }

        const fromMatches = !from || rideFrom.includes(from);
        const toMatches = !to || rideTo.includes(to);
        const dateMatches = !date || rideDate === date;

        if (fromMatches && toMatches && dateMatches) {
            ride.style.display = "flex";
            found = true;
        } else {
            ride.style.display = "none";
        }
    });

    if (!found && rides.length > 0) {
        alert("❌ No matching rides found.");
    }
}

// ---------- SEASONAL THEME ----------
function applySeasonalTheme() {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    document.body.classList.remove("theme-independence", "theme-normal");

    if (month === 8 && day >= 10 && day <= 20) {
        document.body.classList.add("theme-independence");
        return;
    }

    document.body.classList.add("theme-normal");
}

applySeasonalTheme();  