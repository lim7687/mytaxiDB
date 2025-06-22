# 🚕 MyTaxi Backend System

A Node.js + MongoDB backend system for a ride-hailing platform tailored for UTeM students. The platform supports three user roles — **Admin**, **Driver**, and **Passenger** — and provides secure, RESTful API access to all core functions, including ride requests, assignments, and summaries.

---

## 🔧 Technologies Used

- **Node.js** with **Express.js** – Web server and routing
- **MongoDB Atlas** – Cloud-hosted NoSQL database
- **Mongoose** – MongoDB object modeling
- **JWT Authentication** – Token-based security and role-based access control
- **Bcrypt** – Secure password hashing
- **Postman** – API testing
- **Microsoft Azure App Service** – Cloud deployment
- **GitHub Actions** – CI/CD automation

---

## 👥 User Roles & Features

### 🧑‍💼 Admin
- Register drivers or passengers
- View and manage all users
- View ride summary (grouped by driver)
- Delete users

### 🚗 Driver
- Login/logout
- View available ride requests
- Accept one ride at a time
- View assigned rides with passenger info
- Update profile (e.g., car model)
- Mark ride as completed
- Delete own account

### 🧍 Passenger
- Login/logout
- Request a ride (pickup, destination, time)
- View assigned driver info
- Delete own account

---

## 🔐 API Endpoints Summary

### Authentication
- `POST /registerAdmin` – Create admin
- `POST /registerUser` – Admin adds Driver or Passenger
- `POST /login` – Login for all roles
- `DELETE /deleteAccount` – Delete own account (Driver or Passenger)

### Admin Endpoints
- `GET /users` – View all users
- `DELETE /deleteUser/:username` – Remove a user
- `GET /admin/ridesSummary` – View ride stats per driver (with aggregation)

### Driver Endpoints
- `GET /availableRides` – View all pending ride requests
- `PUT /acceptRide/:rideId` – Accept a ride
- `GET /myRides` – View assigned rides with passenger info
- `PUT /updateProfile` – Update driver info
- `PUT /completeRide/:rideId` – Complete a ride

### Passenger Endpoints
- `POST /requestRide` – Create a new ride request
- `GET /myAcceptedRides` – View current ride with driver info

---

## 🌐 Live Deployment (Azure)

This backend is deployed on **Microsoft Azure App Service** and is connected to **MongoDB Atlas**. We can test it via Postman using the generated url link by Azure

