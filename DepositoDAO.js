"use strict";

const db = require("./DepositoDB.js");

// fare 3 metodi divisi per monumenti eventi e ristoranti
// Recupera le informazioni dal batabase deposito 
exports.getTutteAttrazioni = function (luogo) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM deposito WHERE luogo = ?";

    db.all(sql, [luogo], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      const deposito = rows.map((row) => ({
        id: row.id,
        nome: row.nome,
        tipo: row.tipo,
        epoca: row.epoca,
        descrizione: row.descrizione,
        data: row.data,
        luogo: row.luogo,
        valutazione: row.valutazione,
      }));
      resolve(deposito);
    });
  });
};


// funzione che inserisce ciò che è scritto nella finestra
exports.inserisciAttrazione = function (attr) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO deposito (nome, tipo, epoca, descrizione, data, luogo, valutazione)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      attr.nome ?? null,
      attr.tipo,                 // "monumenti" | "eventi" | "ristoranti"
      attr.epoca ?? null,
      attr.descrizione ?? null,
      attr.data ?? null,
      attr.luogo,                // es: "Roma", preso dalla query string pagina
      attr.valutazione ?? null
    ];

    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(true);
    });
  });
};

exports.eliminaAttrazioni = function (listaElimina) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(listaElimina) || listaElimina.length === 0) {
      return resolve(0);
    }

    const ids = listaElimina.map(Number).filter(Number.isFinite);   // filter (evita Nan/Null/undefined)
    if (ids.length === 0) {
      return resolve(0);
    }
    const placeholders = ids.map(() => '?').join(',');

    const sql = `DELETE FROM deposito WHERE id in (${placeholders})`;
    db.run(sql, ids, function (err) {   // ids filtrati, non la lista originale
      if (err) return reject(err);
      resolve(this.changes);
    });
  });
}

exports.ricercaAttrazioni = function ({ ricercaUtente }) {

  return new Promise((resolve, reject) => {

    const ricerca = String(ricercaUtente || '');
    const pattern = `%${ricerca.replace(/[\\%_]/g, m => '\\' + m)}%`;  // uniforma la stringa term 

    const sql = `
    SELECT id, nome, tipo, epoca, descrizione, data, luogo, valutazione FROM deposito WHERE  (
    nome       LIKE ? ESCAPE '\\'
    OR epoca        LIKE ? ESCAPE '\\'
    OR descrizione  LIKE ? ESCAPE '\\'
    OR CAST(data AS TEXT)         LIKE ? ESCAPE '\\'
    OR luogo       LIKE ? ESCAPE '\\'
    OR CAST(valutazione AS TEXT)  LIKE ? ESCAPE '\\'
    )
    ORDER BY id ASC
    LIMIT 50; `;

    db.all(sql, [pattern, pattern, pattern, pattern, pattern, pattern], function (err, rows) {
      if (err) { reject(err); return; }

      const attrazzTrovate = rows.map((row) => ({
        id: row.id,
        nome: row.nome,
        tipo: row.tipo,
        epoca: row.epoca,
        descrizione: row.descrizione,
        data: row.data,
        luogo: row.luogo,
        valutazione: row.valutazione,
      }));

      resolve(attrazzTrovate);
    });
  });
};