# StudioSpace Server API

Express.js backend and MongoDB database service powering the **StudioSpace** peer-to-peer creative studio platform.

---

## 🌐 Live Service & Repositories

- **Live Server API**: [https://studiospace-server-sem6.onrender.com](https://studiospace-server-sem6.onrender.com)
- **Live Client Web App**: [https://studiospace-client-bd.vercel.app](https://studiospace-client-bd.vercel.app)
- **Server Repository**: [https://github.com/shantokumarBD/studiospace-server](https://github.com/shantokumarBD/studiospace-server)
- **Client Repository**: [https://github.com/shantokumarBD/studiospace-client](https://github.com/shantokumarBD/studiospace-client)

---

## 🚀 API Endpoints

### 🏢 Studios Management (CRUD)
- `GET /` - Health check & server status
- `GET /featured-studios` - Fetch top 6 rated production spaces (`.limit(6)`)
- `GET /studios` - Browse studios with category, search, and sort filters
- `GET /studios/:id` - Fetch single studio specifications
- `POST /studios` - Add new studio (Protected by `verifyToken`)
- `PUT /studios/:id` - Update studio listing (Protected by `verifyToken`)
- `DELETE /studios/:id` - Delete studio listing (Protected by `verifyToken`)
- `GET /my-studios?email=...` - Fetch studios owned by user (Protected by `verifyToken`)

### 📅 Production Bookings & Scheduling
- `POST /bookings` - Reserve studio slot with double-booking collision prevention and automatic host email mapping (Protected by `verifyToken`)
- `GET /my-bookings?email=...` - Fetch user's reservations as renter (Protected by `verifyToken`)
- `DELETE /my-bookings/:id` - Cancel booking reservation (Protected by `verifyToken`)

### 👑 Host Production Approval & Requests (Beyond-Requirement)
- `GET /host-bookings?email=...` - Fetch incoming reservation requests made by creators for stages owned by the host (Protected by `verifyToken`)
- `PATCH /bookings/:id/status` - Update reservation status (`Confirmed` or `Cancelled`) by host (Protected by `verifyToken`)

### ❤️ Wishlist Management
- `POST /wishlist` - Save studio to wishlist (Protected by `verifyToken`)
- `GET /wishlist?email=...` - Fetch user saved wishlist (Protected by `verifyToken`)
- `DELETE /wishlist/:id` - Remove studio from wishlist (Protected by `verifyToken`)

---

## 🔒 Advanced Security & Architecture Highlights

- **JWKS-Based JWT Verification**: Mutations (`POST`, `PUT`, `PATCH`, `DELETE`) are strictly guarded by `verifyToken` middleware verifying cryptographic keys against the client's JWKS endpoint.
- **Double-Booking Overlap Algorithm**: Real-time interval overlap check (`callTime < existing.wrapTime && wrapTime > existing.callTime`) preventing simultaneous shoot reservations on the same date and hours.
- **Host Production Approval Engine**: Allows studio hosts to inspect incoming stage bookings and toggle statuses between `Pending`, `Confirmed`, and `Cancelled`.
- **Strict Ownership Isolation**: Endpoints like `/my-studios`, `/my-bookings`, and `/host-bookings` enforce authenticated email-isolated document retrieval.

---

## 🛠️ Local Setup

```bash
npm install
npm run dev # or node index.js
```
