# Futsal Management System / FYP Batch 2079 
# Members 
# .Paruhang Limbu
# .Rajan Rai
# .Sajan Limbu

A full-stack MERN web application for managing futsal court bookings, payments, tournaments, and analytics.

## Tech Stack

- **Frontend:** React.js (Vite), Tailwind CSS, React Router DOM, Axios, Recharts
- **Backend:** Node.js, Express.js, Mongoose
- **Database:** MongoDB Atlas
- **Auth:** JWT + bcryptjs
- **Payments:** Khalti API, eSewa API (mock mode for development)
- **Notifications:** Nodemailer (SMTP), Sparrow SMS (optional)
- **Deployment:** Vercel (frontend), Render/Railway (backend)

---

## Project Structure

```
futsal_management/
├── futsal-backend/        # Express.js REST API
│   ├── config/            # DB and Cloudinary config
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Auth, role, validation, error middleware
│   ├── models/            # Mongoose models
│   ├── routes/            # Express routers
│   ├── services/          # Notification service, cron jobs
│   ├── utils/             # Token generator, fixture algorithm
│   ├── tests/             # Jest tests
│   └── server.js          # App entry point
│
├── futsal-frontend/       # React.js Vite app
│   └── src/
│       ├── components/    # UI atoms, layout, common
│       ├── context/       # Auth context
│       ├── layouts/       # Main, Dashboard, Admin layouts
│       ├── pages/         # All pages by role
│       ├── routes/        # AppRouter
│       ├── services/      # API call functions
│       └── utils/         # Helpers
│
└── .github/workflows/     # CI/CD pipeline
```

---

## Quick Start

### 1. Backend Setup

```bash
cd futsal-backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### 2. Frontend Setup

```bash
cd futsal-frontend
npm install
cp .env.example .env
# Edit .env — set VITE_API_URL
npm run dev
```

---

## Environment Variables

### Backend (`futsal-backend/.env`)

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string (URL-encode special chars in password) |
| `JWT_SECRET` | Secure random string for JWT signing |
| `CLOUDINARY_*` | Cloudinary credentials for image uploads |
| `EMAIL_*` | SMTP credentials for Nodemailer |
| `KHALTI_SECRET_KEY` | Khalti payment API key |
| `ESEWA_MERCHANT_CODE` | eSewa merchant code |
| `MOCK_PAYMENT` | Set `true` to bypass real payment gateways |
| `FRONTEND_URL` | Frontend URL for CORS and payment callbacks |

### Frontend (`futsal-frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL |

---

## API Overview (`/api/v1/`)

| Module | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PUT /auth/profile` |
| Courts | `GET /courts`, `POST /courts`, `PUT /courts/:id`, `PATCH /courts/:id/approve` |
| Bookings | `GET /bookings/slots/:courtId`, `POST /bookings`, `GET /bookings`, `DELETE /bookings/:id` |
| Payment | `POST /payment/initiate`, `POST /payment/verify`, `GET /payment/history` |
| Tournaments | `GET /tournaments`, `POST /tournaments`, `POST /tournaments/:id/register` |
| Admin | `GET /admin/stats`, `GET /admin/users`, `GET /admin/revenue` |
| Notifications | `GET /notifications`, `PATCH /notifications/read-all` |

---

## User Roles

| Feature | Customer | Owner | Admin |
|---|---|---|---|
| Browse/book courts | ✅ | — | — |
| Manage courts | — | ✅ | ✅ |
| Approve courts | — | — | ✅ |
| View own bookings | ✅ | — | — |
| View court bookings | — | ✅ | ✅ |
| Make payments | ✅ | — | — |
| Issue refunds | — | ✅ | ✅ |
| Create tournaments | — | ✅ | ✅ |
| Join tournaments | ✅ | — | — |
| Admin dashboard | — | — | ✅ |

---

## Important Notes

### MongoDB Connection
URL-encode special characters in your MongoDB password:
- `!` → `%21`, `"` → `%22`, `#` → `%23`, `$` → `%24`

Example: password `myP@ss#1` → `myP%40ss%231`

### MongoDB Atlas IP Allowlist
Add your server's public IP (or `0.0.0.0/0` for development) to MongoDB Atlas > Network Access.

### Payment Testing
Set `MOCK_PAYMENT=true` in `.env` to test the full booking→payment flow without real gateways.

### Image Uploads
Cloudinary credentials are required for production. For local development without Cloudinary, the image upload will fail gracefully — courts can still be created without images.

---

## Running Tests

```bash
cd futsal-backend
npm test
```

Tests cover: auth registration/login, fixture generation algorithm, standings calculation.
