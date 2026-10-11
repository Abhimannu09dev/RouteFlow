# RouteFlow — Database Map

## Models

### User (`models/userModel.js`)
| Field | Type | Constraint |
|-------|------|------------|
| companyName | String | required |
| role | enum[logistics, manufacturer, admin] | default: logistics |
| email | String | required, unique |
| password | String | required, minlength: 6 |
| contactNumber, panNo, companyLocation, companyDescription, companyLogo, companyWebsite | String | optional |
| documents | [subdoc] | type, label, filename, url, uploadedAt |
| isVerified, isAccountVerified, submittedForVerification, isActive | Boolean | |
| rejectionReason | String | |
| otpHash, resetTokenHash | String | sparse |
| otpExpires, resetTokenExpires | Date | |
| notificationPreferences | embedded object | 5 boolean flags, all default: true |

**Indexes:**
- `email` — unique (implicit)
- `{ role, isActive }` — logistics fan-out on every new order
- `{ role }` — admin stats queries
- `{ isAccountVerified, submittedForVerification }` — admin verification filters
- `{ resetTokenHash, resetTokenExpires }` — sparse, password reset lookup

---

### Order (`models/orderModel.js`)
| Field | Type | Constraint |
|-------|------|------------|
| orderId | String | required, unique |
| manufacturer | ObjectId → User | required |
| logistics | ObjectId → User | default: null |
| productDetails, vehicleType, routeFrom, routeTo, additionalInfo | String | |
| quantity, weight | Number | required |
| expectedPrice | Number | default: null |
| status | enum[pending, accepted, in transit, delivered, cancelled] | default: pending |
| invoiceNeeded, vatBillNeeded | Boolean | |
| invoiceDocuments, vatBillDocuments | String | |

**Indexes:** `status`, `manufacturer`, `logistics`, `createdAt desc`, `{ status, logistics }`

---

### PriceOffer (`models/priceOfferModel.js`)
| Field | Type | Constraint |
|-------|------|------------|
| order | ObjectId → Order | required |
| orderId | String | ⚠️ denormalized string copy of Order.orderId |
| logistics | ObjectId → User | required |
| proposedPrice | Number | required, min: 1 |
| estimatedDeliveryDays | Number | required, min: 1 |
| currency, note | String | |
| status | enum[pending, accepted, rejected, withdrawn] | default: pending |

**Indexes:**
- `{ order, logistics }` — unique (prevents duplicate bids)
- `{ logistics }` — my-offers, stats, payment initiation
- `{ status }` — accept offer updateMany

---

### Payment (`models/paymentModel.js`)
| Field | Type | Constraint |
|-------|------|------------|
| orderId | ObjectId → Order | required |
| payerId | ObjectId → User | required |
| receiverId | ObjectId → User | required |
| amount | Number | required |
| gateway | enum[khalti, esewa] | required |
| status | enum[pending, completed, failed] | default: pending |
| pidx (Khalti), refId (eSewa), transactionId | String | |

**Indexes:** `orderId`, `payerId`, `receiverId`

---

### Message (`models/messageModel.js`)
| Field | Type | Constraint |
|-------|------|------------|
| orderId | ObjectId → Order | required |
| senderId | ObjectId → User | required |
| receiverId | ObjectId → User | required |
| content | String | default: "" |
| fileUrl, fileName | String | |
| fileType | enum[image, document, null] | |
| isRead | Boolean | default: false |

**Indexes:** `{ orderId, createdAt asc }`, `{ receiverId, isRead }`

---

### Notification (`models/notificationModel.js`)
| Field | Type | Constraint |
|-------|------|------------|
| recipient | ObjectId → User | required |
| type | enum[new_bid, bid_accepted, bid_rejected, order_accepted, new_order, status_update] | required |
| title, message | String | required |
| orderId | ⚠️ plain String | not a ref — no populate, no cascade |
| isRead | Boolean | default: false |

**Index:** `{ recipient, isRead, createdAt desc }`

---

### SupportTicket (`models/supportTicketModel.js`)
| Field | Type | Constraint |
|-------|------|------------|
| userId | ObjectId → User | required |
| subject, message | String | required |
| category | enum[general, technical, billing] | required |
| status | enum[open, in-progress, resolved] | default: open |
| adminReply | String | |
| repliedAt | Date | |

**Indexes:** `{ userId, createdAt desc }`, `{ status }`, `{ category }`

---

## Relationships

```
User ←─[manufacturer]────── Order ──[order]──────→ PriceOffer ←─[logistics]─ User
User ←─[logistics]──────────  │
                               │──[orderId]────────→ Message
                               │──[orderId]────────→ Payment
                               └──(orderId string)─→ Notification (no ref)
User ←─[payerId / receiverId]─ Payment
User ←─[senderId / receiverId] Message
User ←─[recipient]──────────── Notification
User ←─[userId]─────────────── SupportTicket
```

---

## Per-Model Access Map

### User

| Operation | Filter | Controller | Route |
|-----------|--------|------------|-------|
| findOne | `{ email }` | userController | POST /auth/register, /login, /verify-otp, /resend-otp, /forgot-password |
| create | — | userController:59 | POST /auth/register |
| findOne | `{ resetTokenHash, resetTokenExpires:{$gt:now} }` | userController:340 | POST /auth/reset-password |
| findById | select: `isActive, isAccountVerified` | auth.js:14 | **every authenticated request** |
| findById | select: `companyName email role isAccountVerified submittedForVerification` | index.js:75 | GET /auth/me |
| findById | select: profile fields | profileController | GET/PUT /profile |
| findByIdAndUpdate | `$push documents` | profileController:163 | POST /profile/documents |
| findByIdAndUpdate | `$set notificationPreferences` | settingsController:43 | PUT /settings/notifications |
| findByIdAndUpdate | `$set isActive:false` | settingsController:144 | DELETE /settings/account |
| find | `{ role:"logistics", isActive:true }` | orderEvents.js:25 | internal — fires on every new order |
| countDocuments ×8 | role/status combos | adminController:34–46 | GET /admin/stats |
| find + countDocuments | `{ role:{$ne:"admin"}, ...filters }` | adminController:99 | GET /admin/users |
| findById (guard) + findByIdAndUpdate | userId | adminController | PUT /admin/users/:id/approve, /reject |

### Order

| Operation | Filter | Controller | Route |
|-----------|--------|------------|-------|
| create | — | orderController:65 | POST /create/order |
| find + countDocuments | `{ manufacturer }` | orderController:104 | GET /orders (manufacturer) |
| find + countDocuments | `{ logistics:null, status:"pending" }` | orderController:121 | GET /orders (logistics) |
| find + countDocuments | `{ logistics, [status] }` | orderController:155,172 | GET /my-orders |
| findOne + populate | `{ orderId }` | orderController:201 | GET /orders/:orderId |
| findOneAndUpdate | `{ orderId, logistics:userId }` | orderController:246 | PUT /orders/:orderId/status |
| aggregate | group by status | orderController:279 | GET /orders/stats |
| findById | — | chatController, websocket, paymentController | chat, WS, payment |

### PriceOffer

| Operation | Filter | Controller | Route |
|-----------|--------|------------|-------|
| findOne | `{ order, logistics }` | priceOfferController:48 | POST /orders/:orderId/offers |
| find | `{ order, status:{$ne:"withdrawn"} }` | priceOfferController:143 | GET offers (manufacturer) |
| find + aggregate | `{ logistics }` | priceOfferController:365,380 | GET /my-offers, /my-offers/stats |
| updateMany | `{ order, _id:{$ne:accepted}, status:"pending" }` → rejected | priceOfferController:314 | PUT accept |
| findOne | `{ order, status:"accepted" }` | paymentController:101,247 | POST /payment/*/initiate |

### Payment

| Operation | Filter | Controller | Route |
|-----------|--------|------------|-------|
| findOne | `{ orderId, status:"pending" }` | paymentController:86,236 | POST /payment/*/initiate |
| create | — | paymentController:114,259 | POST /payment/*/initiate |
| findById | paymentId | paymentController:181,317 | GET /payment/*/verify |
| findOne | `{ orderId }` sort: -createdAt | paymentController:72 | GET /payment/status/:orderId |
| find + countDocuments | `{ $or:[{payerId},{receiverId}] }` | paymentController:365 | GET /payment/my-payments |

### Message

| Operation | Filter | Controller | Route |
|-----------|--------|------------|-------|
| aggregate | `{ receiverId, isRead:false }` group by orderId | chatController:142 | GET /chat/conversations |
| find + populate | `{ orderId }` sort: createdAt asc | chatController:194 | GET /chat/:orderId/messages |
| updateMany | `{ orderId, receiverId, isRead:false }` → isRead:true | chatController:198, websocket:142 | GET messages + WS mark_read |
| create | — | chatController:266, websocket:123 | POST /chat/:orderId/send + WS send_message |
| countDocuments | `{ receiverId, isRead:false }` | chatController:293 | GET /chat/unread-count |

### Notification

| Operation | Filter | Controller | Route |
|-----------|--------|------------|-------|
| create | — | orderEvents.js:8 | internal — order/bid/status events |
| find | `{ recipient }` sort: -createdAt limit: 50 | notificationController:7 | GET /notifications |
| findOneAndUpdate | `{ _id, recipient }` → isRead:true | notificationController:27 | PUT /notifications/:id/read |
| updateMany | `{ recipient, isRead:false }` | notificationController:43 | PUT /notifications/read-all |

### SupportTicket

| Operation | Filter | Controller | Route |
|-----------|--------|------------|-------|
| create | — | supportController:42 | POST /support |
| find + countDocuments | `{ userId }` sort: -createdAt | supportController:63 | GET /support/my-tickets |
| find + countDocuments | `{ status?, category? }` + populate userId | adminSupportController:31 | GET /admin/support-tickets |
| findByIdAndUpdate | ticketId | adminSupportController:71 | PUT /admin/support-tickets/:id |

---

## Orphan Risk (no cascade deletes)

| Delete | Stale refs left in |
|--------|--------------------|
| User (logistics) | Order.logistics, PriceOffer.logistics, Payment.receiverId, Message.senderId/receiverId |
| User (manufacturer) | Order.manufacturer, Payment.payerId, SupportTicket.userId |
| User (any) | Notification.recipient — persist indefinitely |
| Order | PriceOffer.order, Message.orderId, Payment.orderId — all child records orphaned |

---

## Notes

- `Notification.orderId` is a plain `String`, not an ObjectId ref — no populate possible.
- `PriceOffer.orderId` is a redundant denormalized string copy of `Order.orderId` — keep in sync on order ID changes.
- No model has `pre('remove')` hooks or cascade logic. Deleting a root document leaves child records with stale refs.
