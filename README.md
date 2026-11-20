# Bell'Italia Viaggi

🇬🇧 **English** | 🇮🇹 [Italiano](README.it.md)

A travel web app for discovering Italian cities: for each destination it shows monuments, events and restaurants, with search and ratings. Users can sign up and log in; the administrator can add or remove attractions.

## Tech stack

- **Backend:** Node.js, Express 5
- **Database:** SQLite (`Deposito.db` for attractions, `Utenti.db` for users)
- **Authentication:** Passport (local strategy), bcrypt, express-session
- **Frontend:** HTML, CSS and JavaScript

## Requirements

- [Node.js](https://nodejs.org/) 22.9 or later

## Getting started

1. Clone the repository and enter the folder:

   ```bash
   git clone https://github.com/borghe-cyber/SitoDiViaggi.git
   cd SitoDiViaggi
   ```

2. Install the dependencies:

   ```bash
   npm install
   ```

3. Create the `.env` file from the template and set a secret key for sessions:

   ```bash
   cp .env.example .env
   ```

   To generate a random key you can use:

   ```bash
   openssl rand -hex 32
   ```

4. Start the server:

   ```bash
   npm start
   ```

5. Open your browser at **http://localhost:3000**

## Project structure

```
server.js          Express server and API routes
UserDAO.js         User data access
DepositoDAO.js     Attraction data access
UserDB.js          Connection to Utenti.db
DepositoDB.js      Connection to Deposito.db
public/            Site pages (home, login, attractions table), styles, scripts and images
```

## Main API routes

| Method | Route                   | Description                          |
|--------|-------------------------|--------------------------------------|
| POST   | `/registrazione`        | Register a new user                  |
| POST   | `/login`                | Log in                               |
| GET    | `/logout`               | Log out                              |
| GET    | `/me`                   | Current user's data                  |
| GET    | `/api/attrazioni`       | Attractions for a city               |
| POST   | `/ricerca`              | Search attractions                   |
| POST   | `/inserisci/attrazione` | Add an attraction (admin only)       |
| POST   | `/elimina`              | Delete attractions (admin only)      |
