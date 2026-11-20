"use strict";

const sqlite = require("sqlite3");
const path = require("path");

// percorso assoluto: funziona da qualunque cartella venga avviato il server
const dbPath = path.join(__dirname, "Utenti.db");

// OPEN_READWRITE senza OPEN_CREATE: se il file manca, errore invece di creare un DB vuoto
const db = new sqlite.Database(dbPath, sqlite.OPEN_READWRITE, (err) => {
  if (err) {
    console.error(`Impossibile aprire il database utenti: ${dbPath}`);
    throw err;
  }
});

module.exports = db;
