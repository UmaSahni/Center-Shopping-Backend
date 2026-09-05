# Center Shopping - Production E-Commerce Backend

A production-grade, concurrency-safe E-Commerce backend built with **Express.js**, **MySQL / TiDB Cloud**, **Prisma ORM**, **Socket.io**, and **NMI Payment Gateway**.

---

## 🌐 Live Infrastructure

- **Live API Endpoint**: `http://72.61.246.61:5000/api/v1`
- **Health Check**: `http://72.61.246.61:5000/api/v1/health`
- **Database**: TiDB Cloud (AWS AP-Southeast-1) Distributed MySQL
- **Real-Time WebSocket**: `ws://72.61.246.61:5000`
- **Frontend Live URL**: `https://center-shopping.vercel.app`

---

## 🚀 Key Features & Critical Scenarios Handled

1. **Role-Based Access Control (RBAC) & IDOR Protection**:
   - Distinct roles: `CUSTOMER`, `SALES_AGENT`, and `ADMIN`.
   - JWT authentication with secure `bcryptjs` hashing.
   - Administrative and sales agent route protection with granular permission gates.
   - **IDOR Safeguards**: Customers can only view and modify their own orders and cart items.

2. **Catalog & Inventory Architecture**:
   - 1,050+ physical products across 6 major retail categories with 3,250+ variants.
   - Real-time stock levels with low-stock warnings and product expiry (`expiryDate`) validation.

3. **Concurrency Control & Atomic Stock Deductions**:
   - Uses atomic conditional MySQL queries inside serializable Prisma transactions:
     ```sql
     UPDATE ProductVariant 
     SET stockQuantity = stockQuantity - ? 
     WHERE id = ? AND stockQuantity >= ?;
     ```
   - Eliminates overselling: When multiple customers simultaneously purchase the last stock unit, exactly one succeeds and others receive `409 Conflict (OUT_OF_STOCK_CONFLICT)`.

4. **NMI Payment Gateway Integration**:
   - Secure Direct Post & API transaction handling (`sale` charges, card tokenization).
   - Real-time validation and idempotency keys to prevent duplicate transactions.

5. **Discount & Coupon Engine**:
   - Percentage & Flat discounts with expiry limits, minimum order requirements, and max discount caps.
   - Enforces per-user and total redemption limits with atomic checkout validation.

6. **Real-Time Order Lifecycle Tracking**:
   - Order progression: `CONFIRMED` ➔ `PROCESSING` ➔ `SHIPPED` ➔ `DELIVERED`.
   - Socket.io broadcasts live order status events instantly to customer tracking screens without polling.

7. **Google OAuth & User Synchronization**:
   - Seamless token validation with Firebase Auth and automated customer onboarding.

---

## 👥 Seeded User Accounts

| Role | Email | Password | Access Level |
|---|---|---|---|
| 👑 **Administrator** | `admin@gmail.com` | `Password@123` | Full control, catalog, stock & analytics |
| 💼 **Sales Agent** | `agent@gmail.com` | `Password@123` | Assigned clients, commissions & orders |
| 🛒 **Customer** | `customer@gmail.com` | `Password@123` | Storefront checkout, cart & order tracking |

---

## 🛠️ Local Setup & Configuration

### 1. Prerequisites
- Node.js (v18+)
- MySQL or TiDB Cloud instance

### 2. Installation
```bash
cd backend
npm install
```

### 3. Environment Variables (`.env`)
Create a `.env` file in the `backend/` directory (see `.env.example`):
```env
# Database Connection (MySQL / TiDB Cloud)
DATABASE_URL="mysql://<USERNAME>:<PASSWORD>@<HOST>:<PORT>/<DATABASE>?sslaccept=strict"
# Local fallback example: "mysql://root:@localhost:3306/ecom_db"

# Server Port
PORT=5000

# JWT Auth
JWT_SECRET="your_jwt_secret_key"
JWT_EXPIRES_IN="7d"

# Frontend Client URL
FRONTEND_URL="http://localhost:3000"
NODE_ENV="development"

# NMI Payment Gateway
NMI_SECURITY_KEY="your_nmi_security_key"
NMI_GATEWAY_URL="https://sandbox.nmi.com/api/transact.php"
NMI_CURRENCY="USD"
```

### 4. Database Setup & Seeding
```bash
# Push schema to database
npm run prisma:push

# Seed complete 1,000+ products dataset
npm run prisma:seed
```

### 5. Start Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 6. Automated Concurrency & Resilience Tests
```bash
npm run test:concurrency
```
Validates race conditions, idempotency, coupon expiration, and shipment cancellation guards.
