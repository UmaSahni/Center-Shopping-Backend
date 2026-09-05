# Center-Shopping-Backend

A production-grade, concurrency-safe E-Commerce backend built with **Express.js**, **MySQL (XAMPP / InnoDB)**, **Prisma ORM**, and **Socket.io**.

---

## 🚀 Key Requirements & Critical Scenarios Handled

1. **Authentication & RBAC (Role-Based Access Control)**:
   - Roles: `CUSTOMER`, `ADMIN`, `SALES_AGENT`.
   - JWT authentication with secure password hashing via `bcryptjs`.
   - Role-guard middleware restricting administrative routes.
   - **IDOR Protection**: Customers can only view and modify their own orders.

2. **Product & Inventory Management**:
   - Multi-variant products (pricing, SKUs, sizes/colors).
   - Real-time stock tracking with low-stock alert thresholds.
   - Perishable/time-sensitive goods with `expiryDate` validation.

3. **Concurrency & Race Condition Control (Simultaneous Purchase of Last Item)**:
   - Uses atomic conditional MySQL queries inside serializable transactions:
     ```sql
     UPDATE ProductVariant 
     SET stockQuantity = stockQuantity - ? 
     WHERE id = ? AND stockQuantity >= ?;
     ```
   - Eliminates overselling: if two customers checkout the last item at the exact same millisecond, exactly one succeeds and the other receives `409 Conflict (OUT_OF_STOCK_CONFLICT)`.

4. **Discount & Coupon System**:
   - Validates coupon expiry dates, start dates, minimum order values, and customer role eligibility.
   - Enforces total redemption limits and per-user redemption limits.
   - Re-validated atomically inside the checkout transaction to handle expiry during checkout.

5. **Payment & Duplicate Order Prevention (Idempotency)**:
   - Supports `Idempotency-Key` headers: duplicate checkout requests return the cached original order without double billing or double stock decrements.
   - Handles simulated payment gateway failures cleanly without leaving orphaned records.

6. **Order Management & Real-Time Tracking**:
   - Order progression: `CONFIRMED` → `PROCESSING` → `SHIPPED` → `DELIVERED`.
   - Integrated **Socket.io** WebSocket server: pushes live order updates instantly to customer tracking screens without manual page reloads.

7. **Cancellation & Refund Rules**:
   - Customers can cancel orders while in `CONFIRMED` or `PROCESSING` status (triggers automatic refund and inventory restocking).
   - Cancellation after shipment (`SHIPPED` or `DELIVERED`) is strictly rejected with `HTTP 400 Bad Request`.

8. **Admin Dashboard Analytics**:
   - Aggregated metrics for total revenue, active orders, cancelled orders, low-stock alerts, and expiring products.

---

## 🛠️ Setup Instructions

### 1. Prerequisites
- Node.js (v18+)
- MySQL running (e.g. XAMPP on port 3306)

### 2. Installation & Configuration
```bash
cd backend
npm install
```
Configure `.env`:
```env
DATABASE_URL="mysql://root:@localhost:3306/ecom_db"
PORT=5000
JWT_SECRET="ecom_enterprise_super_secret_jwt_key_2026"
JWT_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:3000"
NODE_ENV="development"
```

### 3. Database Migration & Seeding
```bash
# Push schema to MySQL and generate client
npm run prisma:push

# Seed initial users, products, variants, and edge-case coupons
npm run prisma:seed
```

### 4. Run Server
```bash
# Development with auto-reload
npm run dev

# Production
npm start
```

### 5. Run Automated Critical Scenario Tests
```bash
npm run test:concurrency
```
This runs automated tests validating:
- Concurrent purchase of the last stock item
- Product expiry during checkout
- Coupon expiry during checkout
- Duplicate payment/order prevention (Idempotency)
- Cancellation after shipment rejection
- Security & IDOR protection

---

## 👥 Seeded Test Accounts

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@specbee.com` | `Password@123` |
| **Sales Agent** | `agent@specbee.com` | `Password@123` |
| **Customer 1** | `customer@specbee.com` | `Password@123` |
| **Customer 2** | `buyer2@specbee.com` | `Password@123` |
