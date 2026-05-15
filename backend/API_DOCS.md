# Splitwise Backend — API Reference

Base URL: `http://localhost:3000/api`

All protected routes require: `Authorization: Bearer <token>`

---

## AUTH

| Method | Endpoint             | Auth | Description        |
|--------|----------------------|------|--------------------|
| POST   | /auth/register       | ❌   | Register new user  |
| POST   | /auth/login          | ❌   | Login, get token   |

### POST /auth/register
```json
Body: { "name": "Alice", "email": "alice@example.com", "password": "secret", "avatar_url": "https://..." }
Response 201: { "user": {...}, "token": "eyJ..." }
```

### POST /auth/login
```json
Body: { "email": "alice@example.com", "password": "secret" }
Response 200: { "user": {...}, "token": "eyJ..." }
```

---

## USERS

| Method | Endpoint   | Auth | Description        |
|--------|------------|------|--------------------|
| GET    | /users/me  | ✅   | Get own profile    |
| PATCH  | /users/me  | ✅   | Update own profile |

---

## GROUPS

| Method | Endpoint                          | Auth | Description              |
|--------|-----------------------------------|------|--------------------------|
| POST   | /groups                           | ✅   | Create group             |
| GET    | /groups                           | ✅   | List my groups           |
| GET    | /groups/:id                       | ✅   | Get group details        |
| GET    | /groups/:id/members               | ✅   | List group members       |
| POST   | /groups/:id/members               | ✅   | Add member by email      |
| DELETE | /groups/:id/members/:userId       | ✅   | Remove member            |

### POST /groups
```json
Body: { "group_name": "Trip to Goa", "currency": "INR" }
Response 201: { "id": 1, "group_name": "Trip to Goa", "currency": "INR", ... }
```

### POST /groups/:id/members
```json
Body: { "email": "bob@example.com" }
Response 200: { "message": "Member added successfully" }
```

---

## EXPENSES

| Method | Endpoint        | Auth | Description                        |
|--------|-----------------|------|------------------------------------|
| POST   | /expenses       | ✅   | Create expense + auto-split        |
| GET    | /expenses       | ✅   | List expenses (?group_id=1)        |
| GET    | /expenses/:id   | ✅   | Single expense with splits         |
| DELETE | /expenses/:id   | ✅   | Delete (only payer can delete)     |

### POST /expenses
```json
Body: {
  "group_id": 1,
  "amount": 3000,
  "description": "Hotel booking",
  "date": "2026-05-15",
  "split_with": [1, 2, 3]   // optional — defaults to ALL group members
}
Response 201: {
  "expense": { "id": 5, "amount": "3000.00", ... },
  "splits_count": 3,
  "amount_per_person": "1000.00"
}
```

---

## SPLITS

| Method | Endpoint                               | Auth | Description                       |
|--------|----------------------------------------|------|-----------------------------------|
| PATCH  | /splits/:expenseId/:userId/settle      | ✅   | Mark a split as paid              |
| GET    | /splits/balances?group_id=1            | ✅   | Net balance per member in group   |
| GET    | /splits/my-debts                       | ✅   | All unsettled splits for me       |

### GET /splits/balances?group_id=1
```json
Response: [
  { "id": 1, "name": "Alice", "total_paid": 3000, "total_owed": 1000, "net_balance": 2000 },
  { "id": 2, "name": "Bob",   "total_paid": 0,    "total_owed": 1000, "net_balance": -1000 }
]
```
> net_balance > 0 → they are owed money  
> net_balance < 0 → they owe money

---

## QUICK START

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials and JWT secret

# 3. Create the database
createdb splitwise_db

# 4. Start the server (tables auto-create on first run)
npm run dev
```
