# StudioSpace Server API

Express.js backend and MongoDB database service powering the StudioSpace peer-to-peer creative studio platform.

## 🚀 API Endpoints

- `GET /` - Health check
- `GET /featured-studios` - Fetch top 6 rated production spaces
- `GET /studios` - Browse studios with category, search, and sort filters
- `GET /studios/:id` - Fetch single studio specifications
- `POST /studios` - Add new studio (Protected by `verifyToken`)
- `PUT /studios/:id` - Update studio listing (Protected by `verifyToken`)
- `DELETE /studios/:id` - Delete studio listing (Protected by `verifyToken`)
- `GET /my-studios?email=...` - Fetch studios owned by user (Protected by `verifyToken`)
- `POST /bookings` - Reserve studio slot with double-booking collision prevention (Protected by `verifyToken`)
- `GET /my-bookings?email=...` - Fetch user reservations (Protected by `verifyToken`)
- `DELETE /my-bookings/:id` - Cancel booking reservation (Protected by `verifyToken`)
- `POST /wishlist` - Save studio to wishlist (Protected by `verifyToken`)
- `GET /wishlist?email=...` - Fetch user saved wishlist (Protected by `verifyToken`)
- `DELETE /wishlist/:id` - Remove studio from wishlist (Protected by `verifyToken`)

## 🛠️ Setup

```bash
npm install
npm run dev # or node index.js
```

