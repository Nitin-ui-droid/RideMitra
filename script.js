/* =========================================================
   RIDEMITRA — COMPLETE GLOBAL APPLICATION SCRIPT
   Version: 2.1.0
========================================================= */

"use strict";

/* =========================================================
   STORAGE SHORTCUTS
========================================================= */

const RM_STORAGE = RIDEMITRA_CONFIG.STORAGE;

/* =========================================================
   BASIC HELPERS
========================================================= */

function escapeHTML(value = "") {
    const div = document.createElement("div");
    div.textContent = String(value);
    return div.innerHTML;
}

function generateId(prefix = "rm") {
    return `${prefix}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 9)}`;
}

function formatCurrency(amount) {
    const value = Number(amount) || 0;

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(value);
}

function formatDate(dateValue) {
    if (!dateValue) return "Not specified";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return dateValue;
    }

    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(date);
}

function showToast(message, type = "info") {
    let toast = document.getElementById("rmToast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "rmToast";

        toast.style.cssText = `
            position: fixed;
            right: 20px;
            bottom: 20px;
            z-index: 99999;
            max-width: 360px;
            padding: 14px 18px;
            border-radius: 12px;
            color: white;
            font-family: inherit;
            font-size: 13px;
            font-weight: 600;
            box-shadow: 0 15px 40px rgba(0,0,0,.18);
            transform: translateY(20px);
            opacity: 0;
            transition: all .25s ease;
        `;

        document.body.appendChild(toast);
    }

    const colors = {
        success: "#16a34a",
        error: "#dc2626",
        warning: "#d97706",
        info: "#2563eb"
    };

    toast.style.background = colors[type] || colors.info;
    toast.textContent = message;

    requestAnimationFrame(() => {
        toast.style.transform = "translateY(0)";
        toast.style.opacity = "1";
    });

    clearTimeout(window.rmToastTimer);

    window.rmToastTimer = setTimeout(() => {
        toast.style.transform = "translateY(20px)";
        toast.style.opacity = "0";
    }, 3500);
}


/* =========================================================
   USER SESSION
========================================================= */

function getCurrentUser() {
    return getStoredJSON(
        RM_STORAGE.CURRENT_USER,
        null
    );
}

function saveCurrentUser(user) {
    if (!user) return false;

    setStoredJSON(
        RM_STORAGE.CURRENT_USER,
        user
    );

    setStorageItem(
        RM_STORAGE.LOGGED_IN,
        "true"
    );

    return true;
}

function isLoggedIn() {
    const user = getCurrentUser();

    const status = getStorageItem(
        RM_STORAGE.LOGGED_IN
    );

    return !!user && status === "true";
}

async function logoutUser(redirect = true) {
    try {
        await rideMitraFetch(
            RIDEMITRA_CONFIG.ENDPOINTS.LOGOUT,
            { method: "POST" }
        );
    } catch (error) {
        console.error("Logout API Error:", error);
    }

    removeStorageItem(
        RM_STORAGE.CURRENT_USER
    );

    removeStorageItem(
        RM_STORAGE.LOGGED_IN
    );

    removeStorageItem(
        RM_STORAGE.REMEMBER_ME
    );

    if (redirect) {
        window.location.href = "login.html";
    }
}


/* =========================================================
   REAL BACKEND AUTH
   (talks to Flask + MySQL via /api/register and /api/login —
    NOT localStorage. This makes accounts work across browsers
    and devices.)
========================================================= */

async function registerRemoteUser({
    name,
    email,
    phone,
    password
}) {
    try {
        const response = await rideMitraFetch(
            RIDEMITRA_CONFIG.ENDPOINTS.REGISTER,
            {
                method: "POST",
                body: JSON.stringify({
                    name,
                    email,
                    phone,
                    password
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            return {
                success: false,
                message: data.message || "Unable to create account."
            };
        }

        return {
            success: true,
            user: data.user
        };

    } catch (error) {
        console.error("Register API Error:", error);

        return {
            success: false,
            message: "Network error. Please try again."
        };
    }
}

async function loginRemoteUser(email, password) {
    try {
        const response = await rideMitraFetch(
            RIDEMITRA_CONFIG.ENDPOINTS.LOGIN,
            {
                method: "POST",
                body: JSON.stringify({
                    email,
                    password
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            return {
                success: false,
                message: data.message || "Invalid email or password."
            };
        }

        saveCurrentUser(data.user);

        return {
            success: true,
            user: data.user
        };

    } catch (error) {
        console.error("Login API Error:", error);

        return {
            success: false,
            message: "Network error. Please try again."
        };
    }
}


/* =========================================================
   AUTH PAGE REDIRECTION
========================================================= */

function protectPage() {
    const pageRequiresAuth =
        document.body.dataset.auth === "required";

    if (
        pageRequiresAuth &&
        !isLoggedIn()
    ) {
        window.location.href = "login.html";
    }
}

function redirectAuthenticatedUser() {
    const authPage =
        document.body.dataset.auth === "guest";

    if (
        authPage &&
        isLoggedIn()
    ) {
        window.location.href = "dashboard.html";
    }
}


/* =========================================================
   SIGNUP SYSTEM
========================================================= */

function initializeSignup() {
    const form =
        document.getElementById("signupForm");

    if (!form) return;

    const nameInput =
        document.getElementById("signupName");

    const emailInput =
        document.getElementById("signupEmail");

    const phoneInput =
        document.getElementById("signupPhone");

    const passwordInput =
        document.getElementById("signupPassword");

    const submitButton =
        document.getElementById(
            "createAccountButton"
        );

    const buttonText =
        document.getElementById(
            "createButtonText"
        );

    const message =
        document.getElementById(
            "signupMessage"
        );

    const passwordToggle =
        document.getElementById(
            "passwordToggle"
        );

    function showMessage(text, type) {
        if (!message) return;

        const colors = {
            success: "#16a34a",
            error: "#dc2626",
            info: "#2563eb"
        };

        message.textContent = text;
        message.style.color =
            colors[type] || colors.info;
    }

    function resetButton() {
        if (submitButton) {
            submitButton.disabled = false;
        }

        if (buttonText) {
            buttonText.textContent =
                "Create Account";
        }
    }

    if (phoneInput) {
        phoneInput.addEventListener(
            "input",
            function () {
                this.value = this.value
                    .replace(/\D/g, "")
                    .slice(0, 10);
            }
        );
    }

    if (
        passwordToggle &&
        passwordInput
    ) {
        passwordToggle.addEventListener(
            "click",
            function () {
                const icon =
                    passwordToggle.querySelector("i");

                const isPassword =
                    passwordInput.type === "password";

                passwordInput.type =
                    isPassword
                        ? "text"
                        : "password";

                if (icon) {
                    icon.className =
                        isPassword
                            ? "fa-solid fa-eye-slash"
                            : "fa-solid fa-eye";
                }
            }
        );
    }

    form.addEventListener(
        "submit",
        async function (event) {
            event.preventDefault();

            const name =
                nameInput?.value.trim() || "";

            const email =
                emailInput?.value.trim() || "";

            const phone =
                phoneInput?.value.trim() || "";

            const password =
                passwordInput?.value || "";

            /* VALIDATION */

            if (name.length < 2) {
                showMessage(
                    "Please enter your full name.",
                    "error"
                );

                nameInput?.focus();
                return;
            }

            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailPattern.test(email)) {
                showMessage(
                    "Please enter a valid email address.",
                    "error"
                );

                emailInput?.focus();
                return;
            }

            if (!/^\d{10}$/.test(phone)) {
                showMessage(
                    "Enter a valid 10-digit phone number.",
                    "error"
                );

                phoneInput?.focus();
                return;
            }

            if (
                password.length <
                RIDEMITRA_CONFIG.SETTINGS
                    .MIN_PASSWORD_LENGTH
            ) {
                showMessage(
                    `Password must contain at least ${RIDEMITRA_CONFIG.SETTINGS.MIN_PASSWORD_LENGTH} characters.`,
                    "error"
                );

                passwordInput?.focus();
                return;
            }

            /* LOADING */

            if (submitButton) {
                submitButton.disabled = true;
            }

            if (buttonText) {
                buttonText.textContent =
                    "Creating Account...";
            }

            showMessage(
                "Creating your RideMitra account...",
                "info"
            );

            try {
                const result =
                    await registerRemoteUser({
                        name,
                        email,
                        phone,
                        password
                    });

                if (!result.success) {
                    showMessage(
                        result.message,
                        "error"
                    );

                    resetButton();
                    return;
                }

                showMessage(
                    "Account created successfully! Redirecting to login...",
                    "success"
                );

                if (buttonText) {
                    buttonText.textContent =
                        "Account Created ✓";
                }

                setTimeout(() => {
                    window.location.href =
                        "login.html";
                }, 1000);

            } catch (error) {
                console.error(
                    "Signup Error:",
                    error
                );

                showMessage(
                    "Something went wrong. Please try again.",
                    "error"
                );

                resetButton();
            }
        }
    );
}


/* =========================================================
   LOGIN SYSTEM
========================================================= */

function initializeLogin() {
    const form =
        document.getElementById("loginForm");

    if (!form) return;

    const emailInput =
        document.getElementById("loginEmail");

    const passwordInput =
        document.getElementById("loginPassword");

    const message =
        document.getElementById("loginMessage");

    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );

    function showMessage(text, type) {
        if (!message) return;

        const colors = {
            success: "#16a34a",
            error: "#dc2626",
            info: "#2563eb"
        };

        message.textContent = text;
        message.style.color =
            colors[type] || colors.info;
    }

    form.addEventListener(
        "submit",
        async function (event) {
            event.preventDefault();

            const email =
                emailInput?.value.trim() || "";

            const password =
                passwordInput?.value || "";

            if (!email || !password) {
                showMessage(
                    "Please enter email and password.",
                    "error"
                );

                return;
            }

            if (submitButton) {
                submitButton.disabled = true;
            }

            showMessage(
                "Checking your account...",
                "info"
            );

            {
                const result =
                    await loginRemoteUser(
                        email,
                        password
                    );

                if (!result.success) {
                    showMessage(
                        result.message,
                        "error"
                    );

                    if (submitButton) {
                        submitButton.disabled = false;
                    }

                    return;
                }

                showMessage(
                    "Login successful! Opening dashboard...",
                    "success"
                );

                setTimeout(() => {
                    window.location.href =
                        "dashboard.html";
                }, 700);

            }
        }
    );
}


/* =========================================================
   USER INTERFACE
========================================================= */

function initializeUserInterface() {
    const currentUser =
        getCurrentUser();

    if (!currentUser) return;

    document
        .querySelectorAll("[data-user-name]")
        .forEach(element => {
            element.textContent =
                currentUser.name || "User";
        });

    document
        .querySelectorAll("[data-user-email]")
        .forEach(element => {
            element.textContent =
                currentUser.email || "";
        });

    document
        .querySelectorAll("[data-user-initial]")
        .forEach(element => {
            const initial =
                (currentUser.name || "U")
                    .charAt(0)
                    .toUpperCase();

            element.textContent =
                initial;
        });

    document
        .querySelectorAll("[data-logout]")
        .forEach(button => {
            button.addEventListener(
                "click",
                function () {
                    logoutUser(true);
                }
            );
        });
}


/* =========================================================
   SIDEBAR SYSTEM
========================================================= */

function initializeSidebar() {
    const menuToggle =
        document.getElementById("menuToggle");

    const sideNav =
        document.getElementById("sideNav");

    const overlay =
        document.getElementById("sidebarOverlay");

    const mainLayout =
        document.querySelector(".main-layout");

    if (!menuToggle || !sideNav) return;

    function isMobile() {
        return window.innerWidth <= 992;
    }

    function openSidebar() {
        if (isMobile()) {
            sideNav.classList.add("active");
            overlay?.classList.add("active");

            document.body.style.overflow =
                "hidden";
        } else {
            sideNav.classList.remove("closed");

            mainLayout?.classList.remove(
                "full-width"
            );
        }

        updateIcon();
    }

    function closeSidebar() {
        if (isMobile()) {
            sideNav.classList.remove("active");
            overlay?.classList.remove("active");

            document.body.style.overflow = "";
        } else {
            sideNav.classList.add("closed");

            mainLayout?.classList.add(
                "full-width"
            );
        }

        updateIcon();
    }

    function updateIcon() {
        const icon =
            menuToggle.querySelector("i");

        if (!icon) return;

        const opened = isMobile()
            ? sideNav.classList.contains("active")
            : !sideNav.classList.contains("closed");

        icon.className = opened
            ? "fa-solid fa-xmark"
            : "fa-solid fa-bars";
    }

    menuToggle.addEventListener(
        "click",
        function () {
            const opened = isMobile()
                ? sideNav.classList.contains("active")
                : !sideNav.classList.contains("closed");

            if (opened) {
                closeSidebar();
            } else {
                openSidebar();
            }
        }
    );

    overlay?.addEventListener(
        "click",
        closeSidebar
    );

    document.addEventListener(
        "keydown",
        function (event) {
            if (
                event.key === "Escape" &&
                isMobile()
            ) {
                closeSidebar();
            }
        }
    );

    window.addEventListener(
        "resize",
        function () {
            document.body.style.overflow = "";

            if (!isMobile()) {
                sideNav.classList.remove("active");
                overlay?.classList.remove("active");
            }

            updateIcon();
        }
    );

    updateIcon();
}


/* =========================================================
   RIDE STORAGE
========================================================= */

async function getRides() {
    try {
        const response = await rideMitraFetch(
            RIDEMITRA_CONFIG.ENDPOINTS.RIDES
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            console.error("Get Rides Error:", data);
            return [];
        }

        return (data.rides || []).map(normalizeRide);

    } catch (error) {
        console.error("Get Rides API Error:", error);
        return [];
    }
}

/* Backend sends ride_id / from_location / destination / travel_date /
   departure_time / available_seats / price_per_seat / driver_name.
   The rest of this file expects id / from / to / date / time /
   availableSeats / price / driverName — map it here in one place. */
function normalizeRide(ride) {
    return {
        id: ride.ride_id,
        driverId: ride.driver_id,
        driverName: ride.driver_name,
        from: ride.from_location,
        to: ride.destination,
        date: ride.travel_date,
        time: ride.departure_time,
        seats: ride.available_seats,
        availableSeats: ride.available_seats,
        price: ride.price_per_seat,
        vehicle: ride.vehicle,
        status: ride.status
    };
}


/* =========================================================
   PUBLISH RIDE
========================================================= */

function initializePublishRide() {
    const form =
        document.getElementById("rideForm");

    if (!form) return;

    form.addEventListener(
        "submit",
        async function (event) {
            event.preventDefault();

            const currentUser =
                getCurrentUser();

            if (!currentUser) {
                showToast(
                    "Please login first.",
                    "warning"
                );

                setTimeout(() => {
                    window.location.href =
                        "login.html";
                }, 700);

                return;
            }

            const from =
                document
                    .getElementById("rideFrom")
                    ?.value.trim();

            const to =
                document
                    .getElementById("rideTo")
                    ?.value.trim();

            const date =
                document
                    .getElementById("rideDate")
                    ?.value;

            const time =
                document
                    .getElementById("rideTime")
                    ?.value;

            const seats = Number(
                document
                    .getElementById("rideSeats")
                    ?.value
            );

            const price = Number(
                document
                    .getElementById("ridePrice")
                    ?.value
            );

            const vehicle =
                document
                    .getElementById("vehicle")
                    ?.value.trim();

            if (
                !from ||
                !to ||
                !date ||
                !time ||
                !seats ||
                seats <= 0 ||
                !vehicle
            ) {
                showToast(
                    "Please fill all ride details correctly.",
                    "error"
                );

                return;
            }

            if (
                from.toLowerCase() ===
                to.toLowerCase()
            ) {
                showToast(
                    "Pickup and destination cannot be the same.",
                    "error"
                );

                return;
            }

            try {
                const response = await rideMitraFetch(
                    RIDEMITRA_CONFIG.ENDPOINTS.RIDES,
                    {
                        method: "POST",
                        body: JSON.stringify({
                            from,
                            to,
                            date,
                            time,
                            seats,
                            price,
                            vehicle
                        })
                    }
                );

                const data = await response.json();

                if (!response.ok || !data.success) {
                    showToast(
                        data.message || "Unable to publish ride.",
                        "error"
                    );
                    return;
                }

                showToast(
                    "Ride published successfully!",
                    "success"
                );

                setTimeout(() => {
                    window.location.href =
                        "find-ride.html";
                }, 900);

            } catch (error) {
                console.error("Publish Ride API Error:", error);

                showToast(
                    "Network error. Please try again.",
                    "error"
                );
            }
        }
    );
}


/* =========================================================
   DISPLAY RIDES
========================================================= */
async function initializeRideList() {
    const container =
        document.getElementById(
            "publishedRide"
        );

    if (!container) return;

    const rides = await getRides();

    renderRides(rides);
}

async function renderRides(filteredRides = null) {
    const container =
        document.getElementById(
            "publishedRide"
        );

    if (!container) return;

    const rides =
        filteredRides || await getRides();

    if (!rides.length) {
        container.innerHTML = `
            <div class="no-rides">
                <div class="no-rides-icon">
                    <i class="fa-solid fa-car"></i>
                </div>

                <h3>No rides available yet</h3>

                <p>
                    Be the first to publish a ride
                    and connect with fellow travellers.
                </p>

                <a
                    href="publish-ride.html"
                    class="btn primary"
                >
                    <i class="fa-solid fa-plus"></i>
                    Publish a Ride
                </a>
            </div>
        `;

        return;
    }

    container.innerHTML = "";

    rides.forEach(ride => {
        const card =
            document.createElement("article");

        card.className = "ride-card";

        card.dataset.rideId = ride.id;

        const seats =
            Number(ride.availableSeats);

        card.innerHTML = `
            <div class="ride-card-main">

                <div class="ride-route">

                    <div class="route-place">
                        <span class="route-dot start"></span>

                        <div>
                            <small>FROM</small>
                            <strong>
                                ${escapeHTML(ride.from)}
                            </strong>
                        </div>
                    </div>

                    <div class="route-line">
                        <i class="fa-solid fa-arrow-right"></i>
                    </div>

                    <div class="route-place">
                        <span class="route-dot end"></span>

                        <div>
                            <small>TO</small>
                            <strong>
                                ${escapeHTML(ride.to)}
                            </strong>
                        </div>
                    </div>

                </div>

                <div class="ride-meta">

                    <span>
                        <i class="fa-regular fa-calendar"></i>
                        ${formatDate(ride.date)}
                    </span>

                    <span>
                        <i class="fa-regular fa-clock"></i>
                        ${escapeHTML(ride.time)}
                    </span>

                    <span>
                        <i class="fa-solid fa-car"></i>
                        ${escapeHTML(ride.vehicle)}
                    </span>

                </div>

            </div>

            <div class="ride-card-side">

                <div class="ride-driver">

                    <div class="driver-avatar">
                        ${escapeHTML(
                            ride.driverName
                                ?.charAt(0)
                                .toUpperCase() || "D"
                        )}
                    </div>

                    <div>
                        <small>DRIVER</small>

                        <strong>
                            ${escapeHTML(
                                ride.driverName ||
                                "Driver"
                            )}
                        </strong>
                    </div>

                </div>

                <div class="ride-price">
                    <strong>
                        ${formatCurrency(ride.price)}
                    </strong>

                    <span>per seat</span>
                </div>

                <div class="ride-seats">
                    <i class="fa-solid fa-chair"></i>
                    ${seats} seat${seats !== 1 ? "s" : ""}
                </div>

                <button
                    type="button"
                    class="book-ride-btn"
                    ${seats <= 0 ? "disabled" : ""}
                >
                    ${
                        seats <= 0
                            ? "Fully Booked"
                            : "Book Ride"
                    }
                </button>

            </div>
        `;

        const bookButton =
            card.querySelector(
                ".book-ride-btn"
            );

        bookButton?.addEventListener(
            "click",
            () => bookRide(ride.id)
        );

        container.appendChild(card);
    });
}


/* =========================================================
   BOOK RIDE
========================================================= */

async function bookRide(rideId) {
    const user =
        getCurrentUser();

    if (!user) {
        showToast(
            "Please login to book a ride.",
            "warning"
        );

        setTimeout(() => {
            window.location.href =
                "login.html";
        }, 700);

        return;
    }

    const rides =
        await getRides();

    const ride =
        rides.find(item =>
            item.id === rideId
        );

    if (!ride) {
        showToast(
            "Ride no longer exists.",
            "error"
        );

        return;
    }

    if (
        ride.driverId === user.user_id
    ) {
        showToast(
            "You cannot book your own ride.",
            "warning"
        );

        return;
    }

    if (
        Number(ride.availableSeats) <= 0
    ) {
        showToast(
            "Sorry, this ride is fully booked.",
            "error"
        );

        return;
    }

    const confirmed =
        window.confirm(
            `Book ride from ${ride.from} to ${ride.to} for ${formatCurrency(ride.price)}?`
        );

    if (!confirmed) return;

    try {
        const response = await rideMitraFetch(
            RIDEMITRA_CONFIG.ENDPOINTS.BOOKINGS,
            {
                method: "POST",
                body: JSON.stringify({
                    ride_id: rideId,
                    seats_booked: 1
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            showToast(
                data.message || "Unable to book this ride.",
                "error"
            );
            return;
        }

        showToast(
            "Ride booked successfully! The driver has been notified.",
            "success"
        );

        renderRides();

    } catch (error) {
        console.error("Book Ride API Error:", error);

        showToast(
            "Network error. Please try again.",
            "error"
        );
    }
}


/* =========================================================
   SEARCH RIDES
========================================================= */

function initializeRideSearch() {
    const searchButton =
        document.getElementById(
            "searchButton"
        );

    if (!searchButton) return;

    searchButton.addEventListener(
        "click",
        async function () {
            const from =
                document
                    .getElementById("fromLocation")
                    ?.value
                    .trim()
                    .toLowerCase() || "";

            const to =
                document
                    .getElementById("toLocation")
                    ?.value
                    .trim()
                    .toLowerCase() || "";

            const date =
                document
                    .getElementById("travelDate")
                    ?.value || "";

            const rides =
                await getRides();

            const filtered =
                rides.filter(ride => {
                    const fromMatch =
                        !from ||
                        ride.from
                            .toLowerCase()
                            .includes(from);

                    const toMatch =
                        !to ||
                        ride.to
                            .toLowerCase()
                            .includes(to);

                    const dateMatch =
                        !date ||
                        ride.date === date;

                    return (
                        fromMatch &&
                        toMatch &&
                        dateMatch
                    );
                });

            renderRides(filtered);

            if (!filtered.length) {
                showToast(
                    "No matching rides found.",
                    "info"
                );
            }
        }
    );
}


/* =========================================================
   DASHBOARD STATISTICS
========================================================= */

async function initializeDashboardStats() {
    const user =
        getCurrentUser();

    if (!user) return;

    const rides =
        await getRides();

    /* NOTE: there is no /api/bookings (GET) endpoint yet to list
       "rides I booked as a passenger" — add one on the backend
       (SELECT ... FROM ride_bookings WHERE passenger_id = %s) to
       make this stat accurate. For now it stays at 0 instead of
       showing stale/fake localStorage data. */
    const myBookings = [];

    const myPublished =
        rides.filter(
            ride =>
                ride.driverId === user.user_id
        );

    document
        .querySelectorAll(
            "[data-stat='published-rides']"
        )
        .forEach(element => {
            element.textContent =
                myPublished.length;
        });

    document
        .querySelectorAll(
            "[data-stat='booked-rides']"
        )
        .forEach(element => {
            element.textContent =
                myBookings.length;
        });

    const totalEarnings =
        myPublished.reduce(
            (total, ride) => {
                const bookedSeats =
                    Number(ride.seats) -
                    Number(
                        ride.availableSeats
                    );

                return (
                    total +
                    bookedSeats *
                    Number(ride.price)
                );
            },
            0
        );

    document
        .querySelectorAll(
            "[data-stat='earnings']"
        )
        .forEach(element => {
            element.textContent =
                formatCurrency(
                    totalEarnings
                );
        });
}


/* =========================================================
   ACTIVE NAVIGATION
========================================================= */

function initializeActiveNavigation() {
    const currentPage =
        window.location.pathname
            .split("/")
            .pop() || "index.html";

    document
        .querySelectorAll("a[href]")
        .forEach(link => {
            const href =
                link.getAttribute("href");

            if (href === currentPage) {
                link.classList.add(
                    "active"
                );
            }
        });
}


/* =========================================================
   BOOKING NOTIFICATIONS (for the driver)
   Polls /api/notifications every 20s and toasts any new,
   unread booking so the driver sees it without refreshing.
   Needs the /api/notifications backend route (see the
   app.py patch) to actually return data — until that route
   exists this silently does nothing.
========================================================= */

function initializeNotificationPolling() {
    const user = getCurrentUser();

    if (!user) return;

    async function checkNotifications() {
        try {
            const response = await rideMitraFetch(
                "/api/notifications"
            );

            if (!response.ok) return;

            const data = await response.json();

            if (!data.success) return;

            const unread = (data.notifications || [])
                .filter(n => !n.is_read);

            unread.forEach(n => {
                showToast(n.message, "info");
            });

            document
                .querySelectorAll("[data-notification-count]")
                .forEach(el => {
                    el.textContent = data.unread_count || 0;
                    el.style.display =
                        data.unread_count ? "inline-block" : "none";
                });

            if (unread.length) {
                await rideMitraFetch(
                    "/api/notifications/read",
                    { method: "POST" }
                );
            }

        } catch (error) {
            console.error("Notifications Poll Error:", error);
        }
    }

    checkNotifications();
    setInterval(checkNotifications, 20000);
}


/* =========================================================
   GLOBAL INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {
        protectPage();
        redirectAuthenticatedUser();

        initializeSignup();
        initializeLogin();

        initializeUserInterface();

        initializeSidebar();

        initializePublishRide();

        initializeRideList();

        initializeRideSearch();

        initializeDashboardStats();

        initializeActiveNavigation();

        initializeNotificationPolling();

        console.log(
            "%cRideMitra Application Initialized",
            "color:#ff5a1f;font-weight:bold;"
        );
    }
);
