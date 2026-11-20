// Al caricamento della pagina nel DOM richiama il metodo init();
window.addEventListener("DOMContentLoaded", init);

export async function init() {
  const params = new URLSearchParams(location.search);
  const luogo = params.get("luogo");
  if (!luogo) {
    console.warn("Parametro 'luogo' mancante");
    return;
  } else if (luogo === "Wishlist") {

    const pulsantiAdmin = document.querySelectorAll('.aggiungiBtn, .eliminaBtn');
    pulsantiAdmin.forEach((btn) => {
      btn.hidden = true;
    });

    controlloContenutoWishlist();
    checkIsLogged();
  } else {

    try {
      const res = await fetch(`/api/attrazioni?luogo=${encodeURIComponent(luogo)}`);
      if (!res.ok) throw new Error("Errore durante il caricamento");

      const listaAttrazioni = await res.json();

      const listaMonumenti = [];
      const listaRistoranti = [];
      const listaEventi = [];

      listaAttrazioni.forEach((attrazione) => {
        if (attrazione.tipo == "monumenti") {
          listaMonumenti.push(attrazione);
        }
        if (attrazione.tipo == "eventi") {
          listaEventi.push(attrazione);
        }
        if (attrazione.tipo == "ristoranti") {
          listaRistoranti.push(attrazione);
        }
      });

      document.querySelector(".tabellaMonumenti").innerHTML = "";
      document.querySelector(".tabellaEventi").innerHTML = "";
      document.querySelector(".tabellaRistoranti").innerHTML = "";

      listaMonumenti.forEach((monumento) => {
        aggiungiRigaMonumento(monumento);
      });

      listaEventi.forEach((evento) => {
        aggiungiRigaEvento(evento);
      });

      listaRistoranti.forEach((ristorante) => {
        aggiungiRigaRistorante(ristorante);
      });

      checkIsLogged();

    } catch (err) {
      console.log(err);
    }
  }
}


// document è html 
// Controllo che l'utente sia loggato in caso positivo faccio comparire i pulsanti della wishlist (cuori, wishlistButton)
function checkIsLogged() {
  const logoutBtn = document.querySelector('.logoutBtn');
  const loginBtn = document.querySelector('.loginBtn');
  const cuoriBtn = document.querySelectorAll('.cuore');

  if (localStorage.getItem("loggedIn") === "true") {
    logoutBtn.style.display = "block";
    loginBtn.style.display = "none";

    let wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];

    cuoriBtn.forEach((cuore) => {         // faccio comparire TUTTI i cuori 
      cuore.classList.remove('hidden');

      const checkbox = cuore.querySelector(".checkbox");    // prendo la checkbox cui fa riferimento l'oggetto cuore 
      const attrazioneId = String(checkbox.dataset.id);   // prendo id della checkbox (uguale all'id dell'attrazione)

      checkbox.checked = wishlist.some(el => String(el.id) === attrazioneId);
      checkbox.onchange = null;

      checkbox.addEventListener("change", () => {
        const tr = checkbox.closest("tr");
        if (!tr) return;

        // Recupera l'oggetto salvato nella riga
        const attrazione = JSON.parse(tr.dataset.attrazione || "{}");
        // forza l'id a stringa per coerenza
        attrazione.id = String(attrazione.id);

        operazioniWishList(attrazione, checkbox.checked);

        const params = new URLSearchParams(location.search);
        const luogo = params.get("luogo");
        if (luogo === "Wishlist" && !checkbox.checked) {
          tr.remove();
        }
      });
    });

    // Controllo se l'utente loggato è di tipo admin oppure no, caso positivo mostro pulsanti dedicati
    if (localStorage.getItem("isAdmin") === "true") {
      const aggiungiBtns = document.querySelectorAll('.aggiungiBtn');
      const eliminaBtns = document.querySelectorAll('.eliminaBtn');

      aggiungiBtns.forEach((aggiungiBtn) => {
        aggiungiBtn.classList.remove('hidden');
        aggiungiBtn.addEventListener("click", aggiungiAttrazione);
      });

      eliminaBtns.forEach((eliminaBtn) => {
        eliminaBtn.classList.remove('hidden');
        const tipo = eliminaBtn.dataset.tipo;
        eliminaBtn.addEventListener("click", () => {
          eliminaBtn.classList.add("hidden");
          mostraEliminaCheckbox(tipo)
        });

      });
    }
  } else {    // nascondo pulsante logout e mostro pulsante login (quando utente è sloggato)
    logoutBtn.style.display = "none";
    loginBtn.style.display = "block";
  }
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async function (event) {    // Utente si sta sloggando
      event.preventDefault();

      await fetch("/logout", {
        method: "GET",
        credentials: "include"
      });

      localStorage.setItem("loggedIn", "false");    // Imposto false variabile nel localstorage per tenere traccia se utente è loggato o meno


      logoutBtn.style.display = "none";   // nascondo pulsante logout e mostro pulsante login
      loginBtn.style.display = "block";

      cuoriBtn.forEach((cuore) => {         // faccio scomparire TUTTI i cuori 
        cuore.classList.add('hidden');
      })


      if (localStorage.getItem("isAdmin") === "true") { // Controllo se l'utente loggato è di tipo admin oppure no, caso positivo nascondo pulsanti dedicati 
        const aggiungiBtns = document.querySelectorAll('.aggiungiBtn');
        const eliminaBtns = document.querySelectorAll('.eliminaBtn');

        aggiungiBtns.forEach((aggiungiBtn) => {
          aggiungiBtn.classList.add('hidden');
        });

        eliminaBtns.forEach((eliminaBtn) => {
          eliminaBtn.classList.add('hidden');

        });
      }
    })
  }
}


// funzione per aggiungere attrazione 
function aggiungiAttrazione(e) {
  const btn = e.currentTarget;
  const section = btn.closest("section");
  const titleEl = section.querySelector("h2");
  if (!titleEl) return;

  const sectionTitle = titleEl.textContent.replace(/^[^\wÀ-ÿ]*|\s*$/g, "").replace(/^(\p{Emoji_Presentation}|\p{Emoji})\s*/u, "");
  // Crea e mostra modal
  const dlg = buildModalFields(sectionTitle);
  dlg.showModal();

  // Quando si chiude, se non è "cancel", leggi e inserisci riga
  dlg.addEventListener("close", async () => {
    if (dlg.returnValue === "cancel") return;

    let data = readModalValues(sectionTitle);

    
    if (sectionTitle === "Ristoranti") {
      const v = Number(data.valutazione);
      if (!(v >= 1 && v <= 6)) {
        alert("La valutazione deve essere tra 1 e 5.");
        return;
      }
    }

    try {
      if (sectionTitle === "Monumenti") data.tipo = "monumenti";
      if (sectionTitle === "Eventi") data.tipo = "eventi";
      if (sectionTitle === "Ristoranti") data.tipo = "ristoranti";

      const params = new URLSearchParams(location.search);
      const luogo = params.get("luogo");    // prendo il luogo dal url 
      data.luogo = luogo;

      const res = await fetch("/inserisci/attrazione", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || "Errore durante il salvataggio sul server.");
      }

    } catch (e) {
      console.error(e);
      alert(e.message);   // es. "Devi effettuare il login." se la sessione è scaduta
      return;
    }

    window.location.reload();     // ricarico pagina 
  }, { once: true });
}


// costante globale per tenere traccia degli elementi che l'admin vuole eliminare
const listaElimina = [];


// Mostra i pulsanti di "conferma" e "annulla" per la cancellazione di elementi di una determinata tabella 
function mostraEliminaCheckbox(tipo) {
  let containerBtns; //pulsanti conferma e annulla
  let labels;// è la checkboxes visiva

  if (tipo === "monumenti") {
    labels = document.querySelectorAll(".container-eliminaCheckbox-monumento");
    containerBtns = document.querySelector(".containerMonumentiBtns");
  } else if (tipo === "eventi") {
    containerBtns = document.querySelector(".containerEventiBtns");
    labels = document.querySelectorAll(".container-eliminaCheckbox-evento");
  } else {
    containerBtns = document.querySelector(".containerRistorantiBtns");
    labels = document.querySelectorAll(".container-eliminaCheckbox-ristorante");
  }

  containerBtns.classList.remove("hidden"); // mostro i pulsanti dell'admin alla tabella corretta

  labels.forEach((label) => {
    label.classList.remove("hidden");

    const input = label.querySelector('input[type="checkbox"]');
    input.onchange = null;

    input.addEventListener("change", (evento) => {

      const id = label.dataset.id;
      if (evento.target.checked) {   // if per prendere il true della checkbox (checbox barrata)

        if (!listaElimina.includes(id)) {  // if per controllare che l'id non sia già nell'array 
          listaElimina.push(id);
        }
      } else {
        const indice = listaElimina.findIndex(indx => indx === id);
        if (indice !== -1) {    // if per controllare non sia negativo 
          listaElimina.splice(indice, 1);     // splice (indice di posizione elem da cancellare, quantità da cancellare)
        }
      }
    })
  });


  const annullaBtn = containerBtns.querySelector(".annullaElimina");
  annullaBtn.addEventListener("click", () => {    // listener al pulsante "annulla" dell'admin (annulla la cancellazione di un'attrazione)

    const eliminaBtn = document.querySelector(`.eliminaBtn[data-tipo="${tipo}"]`);
    if (eliminaBtn) eliminaBtn.classList.remove("hidden");

    const checkboxBtns = document.querySelectorAll(".container-eliminaCheckbox");
    checkboxBtns.forEach((checkbox) => {  // nascondo tutte le checkbox rosse
      checkbox.classList.add("hidden");
    });
    containerBtns.classList.add("hidden");  //  nascondo i pulsanti dell'admin
  }, { once: true });


  const confermaBtn = containerBtns.querySelector(".confermaElimina");
  confermaBtn.addEventListener("click", async () => {   // esegue fetch al server per cancellare gli elemnti selezionati

    const res = await fetch("/elimina", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listaElimina }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.message || "Errore nella cancellazione.");
      return;
    }
    window.location.reload();     // ricarico pagina
  });
}

// serve per evitare il problema che la lista rimuove ultimo elemento che è stato tolto invece di quello che 
// volgio togliere 
function operazioniWishList(attrazione, statusCheckbox) {
  const wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];

  const id = String(attrazione.id);

  if (statusCheckbox === true) {
    const esiste = wishlist.some(elemento => String(elemento.id) === id);
    if (!esiste) {
      wishlist.push(attrazione);
    }
  } else {
    const idx = wishlist.findIndex(el => String(el.id) === id);
    if (idx !== -1) {
      wishlist.splice(idx, 1);
    }
  }
  localStorage.setItem("wishlist", JSON.stringify(wishlist));
}


function controlloContenutoWishlist() {
  const wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];

  // Pulisco le tabelle 
  document.querySelector(".tabellaMonumenti")?.replaceChildren();
  document.querySelector(".tabellaEventi")?.replaceChildren();
  document.querySelector(".tabellaRistoranti")?.replaceChildren();

  // Popolo le varie tabelle con gli elementi presi dalla wishlist
  wishlist.forEach((elemento) => {
    if (elemento.tipo === "ristoranti") {
      aggiungiRigaRistorante(elemento);
    } else if (elemento.tipo === "eventi") {
      aggiungiRigaEvento(elemento);
    } else {
      aggiungiRigaMonumento(elemento);
    }
  });
}

// aggiunge alla tabella dei monumenti una riga con un monumento recuperato dal db
function aggiungiRigaMonumento(monumento) {
  const nuovariga = document.createElement("tr");
  nuovariga.dataset.id = monumento.id;

  nuovariga.dataset.attrazione = JSON.stringify({
    id: String(monumento.id),
    nome: monumento.nome,
    tipo: "monumenti",
    epoca: monumento.epoca ?? null,
    descrizione: monumento.descrizione ?? null,
    data: null,
    luogo: null,
    valutazione: null
  });


  nuovariga.innerHTML =
    `
    <td class = "nomeMonumento">${monumento.nome}</td>
    <td class = "epocaMonumento">${monumento.epoca}</td>
    <td class = "descrizioneMonumento">${monumento.descrizione}</td>
  
    <td class = "col-cuore">
    <div class="cuore hidden">
              <div class="heart-container" title="Like">
                <input type="checkbox" class="checkbox" data-id="${monumento.id}">
                <div class="svg-container">
                  <svg viewBox="0 0 24 24" class="svg-outline" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Zm-3.585,18.4a2.973,2.973,0,0,1-3.83,0C4.947,16.006,2,11.87,2,8.967a4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,11,8.967a1,1,0,0,0,2,0,4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,22,8.967C22,11.87,19.053,16.006,13.915,20.313Z">
                    </path>
                  </svg>
                  <svg viewBox="0 0 24 24" class="svg-filled" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Z">
                    </path>
                  </svg>
                  <svg class="svg-celebrate" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="10,10 20,20"></polygon>
                    <polygon points="10,50 20,50"></polygon>
                    <polygon points="20,80 30,70"></polygon>
                    <polygon points="90,10 80,20"></polygon>
                    <polygon points="90,50 80,50"></polygon>
                    <polygon points="80,80 70,70"></polygon>
                  </svg>
                </div>
              </div>
            </div>
      </td>
      <td>
        <label class="container-eliminaCheckbox container-eliminaCheckbox-monumento hidden" data-id="${monumento.id}">
        <input type="checkbox" >
        <div class="checkmark"></div>
        </label>
      </td>
    `;

  const corpoTabella = document.querySelector(".tabellaMonumenti");
  corpoTabella.appendChild(nuovariga);
}

function aggiungiRigaEvento(evento) {
  const nuovariga = document.createElement("tr");
  nuovariga.dataset.id = evento.id;

  nuovariga.dataset.attrazione = JSON.stringify({
    id: String(evento.id),
    nome: evento.nome,
    tipo: "eventi",
    epoca: null,
    descrizione: null,
    data: evento.data ?? null,
    luogo: evento.luogo ?? null,
    valutazione: null
  });

  nuovariga.innerHTML =
    `
    <td class = "nomeEvento">${evento.nome}</td>
    <td class = "dataEvento">${evento.data}</td>
    <td class = "luogoEvento">${evento.luogo}</td>

     <td class = "col-cuore">
   <div class="cuore hidden">
              <div class="heart-container" title="Like">
                <input type="checkbox" class="checkbox" data-id="${evento.id}">
                <div class="svg-container">
                  <svg viewBox="0 0 24 24" class="svg-outline" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Zm-3.585,18.4a2.973,2.973,0,0,1-3.83,0C4.947,16.006,2,11.87,2,8.967a4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,11,8.967a1,1,0,0,0,2,0,4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,22,8.967C22,11.87,19.053,16.006,13.915,20.313Z">
                    </path>
                  </svg>
                  <svg viewBox="0 0 24 24" class="svg-filled" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Z">
                    </path>
                  </svg>
                  <svg class="svg-celebrate" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="10,10 20,20"></polygon>
                    <polygon points="10,50 20,50"></polygon>
                    <polygon points="20,80 30,70"></polygon>
                    <polygon points="90,10 80,20"></polygon>
                    <polygon points="90,50 80,50"></polygon>
                    <polygon points="80,80 70,70"></polygon>
                  </svg>
                </div>
              </div>
            </div>
      </td>
      <td>
        <label class="container-eliminaCheckbox container-eliminaCheckbox-evento hidden"  data-id="${evento.id}">
        <input type="checkbox" >
        <div class="checkmark"></div>
        </label>
      </td>
    `;

  const corpoTabella = document.querySelector(".tabellaEventi");
  corpoTabella.appendChild(nuovariga);
}

function aggiungiRigaRistorante(ristorante) {
  const nuovariga = document.createElement("tr");
  nuovariga.dataset.id = ristorante.id;

  nuovariga.dataset.attrazione = JSON.stringify({
    id: String(ristorante.id),
    nome: ristorante.nome,
    tipo: "ristoranti",
    epoca: null,
    descrizione: null,
    data: null,
    luogo: null,
    valutazione: ristorante.valutazione ?? null
  });

  nuovariga.innerHTML =
    `
    <td class = "nomeRistorante">${ristorante.nome}</td>
    <td class = "valutazioneRistorante">${ristorante.valutazione}</td>

     <td class = "col-cuore">
   <div class="cuore hidden">
              <div class="heart-container" title="Like">
                <input type="checkbox" class="checkbox" data-id="${ristorante.id}">
                <div class="svg-container">
                  <svg viewBox="0 0 24 24" class="svg-outline" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Zm-3.585,18.4a2.973,2.973,0,0,1-3.83,0C4.947,16.006,2,11.87,2,8.967a4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,11,8.967a1,1,0,0,0,2,0,4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,22,8.967C22,11.87,19.053,16.006,13.915,20.313Z">
                    </path>
                  </svg>
                  <svg viewBox="0 0 24 24" class="svg-filled" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Z">
                    </path>
                  </svg>
                  <svg class="svg-celebrate" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="10,10 20,20"></polygon>
                    <polygon points="10,50 20,50"></polygon>
                    <polygon points="20,80 30,70"></polygon>
                    <polygon points="90,10 80,20"></polygon>
                    <polygon points="90,50 80,50"></polygon>
                    <polygon points="80,80 70,70"></polygon>
                  </svg>
                </div>
              </div>
            </div>
      </td>
      <td>
        <label class="container-eliminaCheckbox container-eliminaCheckbox-ristorante hidden"  data-id="${ristorante.id}">
        <input type="checkbox">
        <div class="checkmark"></div>
        </label>
      </td>
    `;

  const corpoTabella = document.querySelector(".tabellaRistoranti");
  corpoTabella.appendChild(nuovariga);
}

// aggiunta della finestra di aggiunta 
const FIELD_MAP = {
  "Monumenti": [
    { name: "nome", label: "Nome", type: "text", placeholder: "Colosseo", required: true },
    { name: "epoca", label: "Epoca", type: "text", placeholder: "Romana", required: true },
    { name: "descrizione", label: "Descrizione", type: "textarea", placeholder: "Breve descrizione...", required: true },
  ],
  "Eventi": [
    { name: "nome", label: "Nome", type: "text", placeholder: "Notte Bianca", required: true },
    { name: "data", label: "Data", type: "date", placeholder: "", required: true },
    { name: "luogo", label: "Luogo", type: "text", placeholder: "Piazza Centrale", required: true },
  ],
  "Ristoranti": [
    { name: "nome", label: "Nome", type: "text", placeholder: "Trattoria Da Mario", required: true },
    { name: "valutazione", label: "Valutazione (1-5)", type: "number", placeholder: "5", required: true, min: 1, max: 5, step: 1 },
  ],
};

// Utility: crea il dialog modale una sola volta
function ensureModal() {
  let dlg = document.getElementById("modal-add-row");
  if (dlg) return dlg;

  dlg = document.createElement("dialog");
  dlg.id = "modal-add-row";
  dlg.innerHTML = `
    <form method="dialog" class="modal-form">
      <h3 id="modal-title" style="margin-top:0">Aggiungi</h3>
      <div class="modal-fields"></div>

      <div class="modal-actions" style="display:flex; gap:.5rem; justify-content:flex-end; margin-top:1rem">
        <button type="button" class="btn-cancel">Annulla</button>
        <button type="submit" class="btn-save">Salva</button>
      </div>
    </form>
  `;

  
  const style = document.createElement("style");
  style.textContent = `
    dialog#modal-add-row {
      border: none;
      border-radius: 12px;
      padding: 1.2rem 1.2rem .8rem;
      max-width: 560px;
      width: 92vw;
      box-shadow: 0 12px 40px rgba(0,0,0,.25);
    }
    .modal-form label { display:block; font-weight:600; margin:.6rem 0 .3rem; }
    .modal-form input, .modal-form textarea, .modal-form select {
      width:100%; padding:.6rem .7rem; border:1px solid #ddd; border-radius:8px; font:inherit;
    }
    .modal-form textarea { min-height: 90px; resize: vertical; }
    .btn-cancel { background:#eee; border:1px solid #ddd; border-radius:8px; padding:.55rem .9rem; cursor:pointer; }
    .btn-save   { background:#2563eb; color:white; border:1px solid #1e40af; border-radius:8px; padding:.55rem .9rem; cursor:pointer; }
    .btn-save:disabled { opacity:.6; cursor:not-allowed; }
  `;
  document.head.appendChild(style);
  document.body.appendChild(dlg);
  return dlg;
}

// Crea dinamicamente i campi nel modal in base alla sezione
function buildModalFields(sectionTitle, initial = {}) {
  const dlg = ensureModal();
  const titleEl = dlg.querySelector("#modal-title");
  const fieldsWrap = dlg.querySelector(".modal-fields");

  titleEl.textContent = `Aggiungi — ${sectionTitle}`;
  fieldsWrap.innerHTML = ""; // pulisci

  const spec = FIELD_MAP[sectionTitle] || [];
  for (const f of spec) {
    const id = `fld_${sectionTitle}_${f.name}`;
    const label = document.createElement("label");
    label.setAttribute("for", id);
    label.textContent = f.label;

    let input;
    if (f.type === "textarea") {
      input = document.createElement("textarea");
    } else {
      input = document.createElement("input");
      input.type = f.type || "text";
      if (f.min != null) input.min = f.min;
      if (f.max != null) input.max = f.max;
      if (f.step != null) input.step = f.step;
    }

    input.id = id;
    input.name = f.name;
    input.placeholder = f.placeholder || "";
    if (f.required) input.required = true;
    if (initial[f.name] != null) input.value = initial[f.name];

    fieldsWrap.appendChild(label);
    fieldsWrap.appendChild(input);
  }

  // bottone annulla
  dlg.querySelector(".btn-cancel").onclick = () => dlg.close("cancel");
  // submit -> chiude con "default"
  dlg.querySelector("form").onsubmit = (e) => {
    // validazione HTML5: se invalido, previeni chiusura
    if (!e.target.checkValidity()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  };
  return dlg;
}

// Raccoglie i valori attuali del form
function readModalValues(sectionTitle) {
  const spec = FIELD_MAP[sectionTitle] || [];
  const values = {};
  for (const f of spec) {
    const el = document.querySelector(`#fld_${sectionTitle}_${f.name}`);
    values[f.name] = el ? el.value.trim() : "";
  }
  return values;
}
