"use strict";

const db = require("./UserDB.js");
const bcrypt = require("bcrypt");

// Recupera tutti gli utenti all'interno del database Utenti.db
exports.getAllUser = function () {
    return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM Utenti";
        db.all(sql, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            const utente = rows.map((row) => ({
                email: row.email,
                password: row.password,
                ruolo: row.ruolo,
            }));
            resolve(utente);
        });
    });
};


exports.getUser = function (emailUtente, passwordUtente)
{
    return new Promise((resolve, reject) => {

        const sql = "SELECT * FROM Utenti WHERE email = ?";
        db.get(sql, [emailUtente], (err, row) => {
            if (err) reject(err);
            else if (row === undefined) resolve({ error: "Utente non trovato" });
            else {
                // la colonna nel DB si chiama "Id" (maiuscola)
                const utente = { id: row.Id, email: row.email, ruolo: row.ruolo };
                let controllo = false;

                if (bcrypt.compareSync(passwordUtente, row.password)) { // faccio una comparazione tra la
                    controllo = true;//password del databe che è crypta , con una non criptata     
                }
                resolve({ utente, controllo })
            }
        });
    });
};

// usata dalla sessione: restituisce l'utente, oppure null se non esiste più
exports.getUserById = function (idUtente) {
    return new Promise((resolve, reject) => {
        const sql = "SELECT Id, email, ruolo FROM Utenti WHERE Id = ?";

        db.get(sql, [idUtente], (err, row) => {
            if (err) reject(err);
            else if (row === undefined) resolve(null);
            else resolve({ id: row.Id, email: row.email, ruolo: row.ruolo });
        });
    });
};



// esporto il metodo 
// controlla se esiste già un utente con questa email
exports.emailEsistente = function (email) {
    return new Promise((resolve, reject) => {
        db.get("SELECT 1 FROM Utenti WHERE email = ?", [email], (err, row) => {
            if (err) reject(err);
            else resolve(row !== undefined);
        });
    });
};

exports.inserisciUtente = function (utente) {
    return new Promise((resolve, reject) => {
        const sql = "INSERT INTO Utenti(email, password, ruolo) VALUES (?, ?, ?)";

        bcrypt.hash(utente.password, 10)
            .then((passHash) => {
                // la callback va DENTRO db.run; "function" (non arrow) per avere this.lastID
                db.run(sql, [utente.email, passHash, utente.ruolo], function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
            })
            .catch(reject);
    });
};