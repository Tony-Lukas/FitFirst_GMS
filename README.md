# FitFirst

FitFirst is a student-level Gym Management System built with Next.js, PostgreSQL, JWT authentication, and Socket.IO. It includes the minimum core features needed for a gym project: user auth, plan management, subscriptions, manual payments, member check-in/check-out, and a simple live owner dashboard.

## Project Overview

This project has two user roles:

- `owner`
- `customer`

Customers can:

- register and log in
- view available plans
- subscribe to a plan
- view their subscriptions
- view payment history
- check in and check out

Owners can:

- log in to the owner dashboard
- create, edit, and delete plans
- view customers and their subscriptions
- add manual payment records
- update payment paid/unpaid status
- see the current checked-in member count
- receive live dashboard updates through Socket.IO

## Tech Stack

- Next.js App Router
- JavaScript / JSX only
- PostgreSQL
- `pg`
- `bcrypt`
- `jsonwebtoken`
- `socket.io`
- Plain CSS and CSS Modules

## Main Features

- JWT-based authentication
- Role-based access control
- Plan CRUD for owner
- Subscription creation for customers
- Overlap protection for active subscriptions
- Manual payment tracking
- Check-in and check-out flow
- Real-time owner dashboard updates
- SQL migrations and seed data

## Project Structure

```bash
app/                  # Next.js pages and API routes
components/           # Shared client components
lib/                  # DB, auth, validation, socket helpers
migrations/           # SQL schema migration files
scripts/              # Migration and seed runners
seeds/                # Seed SQL
socket-server.js      # Separate Socket.IO server
Dockerfile            # Production container image definition
docker-entrypoint.sh  # Starts Next.js and Socket.IO together
```

## Prerequisites

Before running the project, make sure you have:

- Node.js installed
- npm installed
- PostgreSQL installed and running
- a PostgreSQL database created for this project

Recommended:

- Node.js 20+
- PostgreSQL 14+

Optional:

- Docker

## Environment Variables

Create a `.env` file in the project root. You can copy values from `.env.example`.

### Example

```bash
DB_URL=postgresql://postgres:postgres@localhost:5432/fitfirst
JWT_SECRET=replace_with_a_long_random_secret
PORT=3000
SOCKET_PORT=4001
SOCKET_URL=http://localhost:4001
SOCKET_SERVER_SECRET=replace_with_another_secret
NEXT_PUBLIC_SOCKET_URL=http://localhost:4001
```

### Variable Meaning

- `DB_URL`: PostgreSQL connection string
- `JWT_SECRET`: secret key used to sign JWT tokens
- `PORT`: Next.js app port
- `SOCKET_PORT`: Socket.IO server port
- `SOCKET_URL`: internal URL used by the API to notify the socket server
- `SOCKET_SERVER_SECRET`: shared secret for internal socket broadcast requests
- `NEXT_PUBLIC_SOCKET_URL`: socket URL used by the frontend

## Database Setup

Create a PostgreSQL database first if you have not already done so.

Example:

```sql
CREATE DATABASE fitfirst;
```

Make sure your `DB_URL` in `.env` points to that database.

## Step-by-Step Running Guide

### 1. Install dependencies

```bash
npm install
```

### 2. Create the environment file

Copy `.env.example` to `.env`.

```bash
cp .env.example .env
```

Then update the values if your PostgreSQL username, password, host, or database name are different.

### 3. Start PostgreSQL

Make sure your PostgreSQL server is running before continuing.

### 4. Run database migrations

This creates the required tables.

```bash
npm run db:migrate
```

### 5. Seed the database

This inserts:

- one owner account
- one sample customer
- sample plans

```bash
npm run db:seed
```

### 6. Start the Socket.IO server

Open a terminal and run:

```bash
npm run socket
```

By default it runs on:

```bash
http://localhost:4001
```

### 7. Start the Next.js app

Open another terminal and run:

```bash
npm run dev
```

By default the app runs on:

```bash
http://localhost:3000
```

### 8. Open the app in your browser

Visit:

```bash
http://localhost:3000
```

## Seed Login Accounts

After seeding, you can use these accounts:

### Owner

- Email: `owner@fitfirst.local`
- Password: `owner123`

### Customer

- Email: `customer@fitfirst.local`
- Password: `customer123`

## How to Use the System

### Customer Flow

1. Register a new account or log in with the seeded customer account.
2. Go to `/plans`.
3. Choose a plan and subscribe.
4. Go to `/profile`.
5. Use the check-in and check-out buttons.
6. Review subscriptions and payment history.

### Owner Flow

1. Log in with the owner account.
2. Open `/owner`.
3. Create, edit, or delete plans.
4. View members and their subscriptions.
5. Add a payment record to a subscription.
6. Mark payments as paid or unpaid.
7. Watch live checked-in member updates on the dashboard.

## Available Pages

- `/`
- `/login`
- `/register`
- `/plans`
- `/profile`
- `/owner`

## API Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Plans

- `GET /api/plans`
- `POST /api/plans`
- `PUT /api/plans/:id`
- `DELETE /api/plans/:id`

### Subscriptions

- `POST /api/subscriptions`
- `GET /api/subscriptions`
- `PUT /api/subscriptions/:id/cancel`

### Payments

- `GET /api/subscriptions/:id/payments`
- `POST /api/subscriptions/:id/payments`
- `PUT /api/payments/:id`

### Check-ins

- `POST /api/checkins/start`
- `POST /api/checkins/finish`
- `GET /api/checkins`

### Dashboard

- `GET /api/dashboard/current`

## Production Run Guide

### 1. Build the project

```bash
npm run build
```

### 2. Start the Next.js production server

```bash
npm run start
```

### 3. Start the socket server in another terminal

```bash
npm run socket
```

## Docker Run Guide

The repository includes a production `Dockerfile` that starts both the Next.js app and the Socket.IO server in one container.

### 1. Create the environment file

Make sure `.env` exists and contains your production or local database credentials.

```bash
cp .env.example .env
```

### 2. Build the Docker image

```bash
docker build -t fitfirst .
```

### 3. Run database migrations

Run migrations against your PostgreSQL database before starting the app container.

```bash
docker run --rm --env-file .env fitfirst npm run db:migrate
```

### 4. Seed the database

This step is optional if you already have data.

```bash
docker run --rm --env-file .env fitfirst npm run db:seed
```

### 5. Start the container

```bash
docker run --env-file .env -p 3000:3000 -p 4001:4001 fitfirst
```

The app will be available at:

```bash
http://localhost:3000
```

The socket server will be available at:

```bash
http://localhost:4001
```

## Helpful Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run db:migrate
npm run db:seed
npm run socket
```

## Notes

- JWT tokens are stored in `localStorage`.
- Passwords are hashed with `bcrypt`.
- Database queries use parameterized PostgreSQL queries.
- Real-time events are broadcast from the API to the separate Socket.IO server.
- Styling uses plain CSS without Tailwind.

## Troubleshooting

### Migration or seed fails

Check:

- PostgreSQL is running
- the database exists
- `DB_URL` is correct
- your PostgreSQL user has permission to connect
- if using Docker, the database host in `DB_URL` is reachable from the container

### Socket updates do not appear

Check:

- `npm run socket` is running
- `SOCKET_URL` matches the socket server
- `NEXT_PUBLIC_SOCKET_URL` matches the socket server
- `SOCKET_SERVER_SECRET` is the same everywhere
- if using Docker, port `4001` is exposed and mapped correctly

### Login does not work after seed

Run the seed again:

```bash
npm run db:seed
```

Then try the seeded credentials again.
