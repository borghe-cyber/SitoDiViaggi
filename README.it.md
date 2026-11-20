# Bell'Italia Viaggi

🇬🇧 [English](README.md) | 🇮🇹 **Italiano**

Web app di viaggi per scoprire le città italiane: per ogni destinazione mostra monumenti, eventi e ristoranti, con ricerca e valutazioni. Gli utenti possono registrarsi e fare login; l'amministratore può aggiungere o eliminare attrazioni.

## Tecnologie

- **Backend:** Node.js, Express 5
- **Database:** SQLite (`Deposito.db` per le attrazioni, `Utenti.db` per gli utenti)
- **Autenticazione:** Passport (strategia locale), bcrypt, express-session
- **Frontend:** HTML, CSS e JavaScript

## Requisiti

- [Node.js](https://nodejs.org/) 22.9 o superiore

## Avvio

1. Clona la repository ed entra nella cartella:

   ```bash
   git clone https://github.com/borghe-cyber/SitoDiViaggi.git
   cd SitoDiViaggi
   ```

2. Installa le dipendenze:

   ```bash
   npm install
   ```

3. Crea il file `.env` partendo dal modello e imposta una chiave segreta per le sessioni:

   ```bash
   cp .env.example .env
   ```

   Per generare una chiave casuale puoi usare:

   ```bash
   openssl rand -hex 32
   ```

4. Avvia il server:

   ```bash
   npm start
   ```

5. Apri il browser su **http://localhost:3000**

## Struttura del progetto

```
server.js          Server Express e rotte API
UserDAO.js         Accesso ai dati degli utenti
DepositoDAO.js     Accesso ai dati delle attrazioni
UserDB.js          Connessione a Utenti.db
DepositoDB.js      Connessione a Deposito.db
public/            Pagine del sito (home, login, tabella attrazioni), stili, script e immagini
```

## API principali

| Metodo | Rotta                   | Descrizione                         |
|--------|-------------------------|-------------------------------------|
| POST   | `/registrazione`        | Registra un nuovo utente            |
| POST   | `/login`                | Login                               |
| GET    | `/logout`               | Logout                              |
| GET    | `/me`                   | Dati dell'utente loggato            |
| GET    | `/api/attrazioni`       | Attrazioni di una città             |
| POST   | `/ricerca`              | Ricerca tra le attrazioni           |
| POST   | `/inserisci/attrazione` | Aggiunge un'attrazione (solo admin) |
| POST   | `/elimina`              | Elimina attrazioni (solo admin)     |
