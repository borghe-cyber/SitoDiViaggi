import { createAlert } from "../AlertTemplate.js";

// --- helper DOM ---
const yearEl = document.getElementById('year');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const authInner = document.querySelector('.auth-inner'); // contenitore del pannello auth


// setta l'anno nel footer
if (yearEl) yearEl.textContent = new Date().getFullYear();

// crea (o restituisce) un contenitore messaggi sopra i form
function getMessageContainer() {
  let c = authInner.querySelector('.msg-container');
  if (!c) {
    c = document.createElement('div');
    c.className = 'msg-container';
    // inserisco come primo figlio
    authInner.insertBefore(c, authInner.firstChild);
  }
  return c;
}

// mostra messaggio (type: 'info' | 'success' | 'error')
function showMessage(text, type = 'info', timeout = 5000) {
  const c = getMessageContainer();
  c.innerHTML = ''; // pulisce messaggi precedenti
  const div = document.createElement('div');
  div.className = `msg msg-${type}`;
  div.setAttribute('role', 'status');
  div.textContent = text;
  c.appendChild(div);
  if (timeout > 0) {
    setTimeout(() => {
      if (div.parentNode) div.parentNode.removeChild(div);
    }, timeout);
  }
}

// --- tab switching ---
function showLogin() {
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  tabLogin.setAttribute('aria-selected', 'true');
  tabRegister.setAttribute('aria-selected', 'false');

  formLogin.classList.remove('hidden');
  formRegister.classList.add('hidden');

  // pulisco messaggi
  const c = getMessageContainer();
  c.innerHTML = '';
}

function showRegister() {
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  tabRegister.setAttribute('aria-selected', 'true');
  tabLogin.setAttribute('aria-selected', 'false');

  formRegister.classList.remove('hidden');
  formLogin.classList.add('hidden');

  const c = getMessageContainer();
  c.innerHTML = '';
}

if (tabLogin) tabLogin.addEventListener('click', showLogin);
if (tabRegister) tabRegister.addEventListener('click', showRegister);

// --- util validation ---
function isValidEmail(email) {
  // semplice regex per email, sufficiente per validazione client
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setButtonBusy(button, busy = true) {
  if (!button) return;
  button.disabled = busy;
  button.setAttribute('aria-busy', busy ? 'true' : 'false');
  if (busy) {
    button.dataset.origText = button.textContent;
    button.textContent = 'Caricamento...';
  } else {
    button.textContent = button.dataset.origText || button.textContent;
    delete button.dataset.origText;
  }
}

// --- submit handlers ---
// LOGIN
formLogin.addEventListener('submit', async (ev) => {
  ev.preventDefault();

  const email = formLogin.email.value.trim();// trim compatta la stringa (rimuove spazi)
  const password = formLogin.password.value;

  if (!email || !password) {
    showError('Compila email e password.', 'error');
    return;
  }
  if (!isValidEmail(email)) {
    showError('Inserisci un indirizzo email valido.');
    return;
  }

  const submitBtn = formLogin.querySelector('button[type="submit"]');
  setButtonBusy(submitBtn, true);

  try {

    const utente = { email: email, password: password };

    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },// fisso
      body: JSON.stringify(utente)
    });

    if (!res.ok) {
      // tenta leggere messaggio di errore dal server
      let errMsg = 'Errore di autenticazione.';
      try { const j = await res.json(); if (j && j.message) errMsg = j.message; } catch (e) {/* ignora */ }
      throw new Error(errMsg);
    }

    const data = await res.json();// await aspetto la risposta del server 

    const ruolo = data.ruolo;
    if (ruolo === "admin") {
      localStorage.setItem("isAdmin", "true");// salvo lo stato di admin nel local storage 
    }
    else {
      localStorage.setItem("isAdmin", "false");
    }

    showSuccess("Login effettuato con successo");

    localStorage.setItem("loggedIn", "true");

    window.location.href = "/index.html";
  } catch (err) {
    console.error(err);
    showError(err.message);
  } finally {
    setButtonBusy(submitBtn, false);
  }
});

// REGISTER
formRegister.addEventListener('submit', async (ev) => {
  ev.preventDefault();

  const email = formRegister.email.value.trim();
  const password = formRegister.password.value;
  const confirm = formRegister.confirm_password.value;
  const roleEl = formRegister.querySelector('input[name="role"]:checked');
  const ruolo = roleEl ? roleEl.value : null;

  if (!email || !password || !confirm || !ruolo) {
    showError('Compila tutti i campi e scegli un ruolo (Utente o Admin).');
    return;
  }
  if (!isValidEmail(email)) {
    showError('Inserisci un indirizzo email valido.');
    return;
  }
  if (password.length < 6) {
    showError('La password deve avere almeno 6 caratteri.');
    return;
  }
  if (password !== confirm) {
    showError('Le password non coincidono.');
    return;
  }

  const submitBtn = formRegister.querySelector('button[type="submit"]');
  setButtonBusy(submitBtn, true);

  try {
    const payload = { email, password, ruolo };
    const res = await fetch('/registrazione', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      let errMsg = 'Errore durante la registrazione.';
      try { const j = await res.json(); if (j && j.message) errMsg = j.message; } catch (e) {/* ignore */ }
      throw new Error(errMsg);
    }

    const data = await res.json();
    showSuccess('Registrazione avvenuta con successo. Puoi ora effettuare il login.');

    // pulisco form e torno al tab login
    formRegister.reset();
    showLogin();

  } catch (err) {
    console.error(err);
    showError(err.message || 'Errore durante la registrazione.');

  } finally {
    setButtonBusy(submitBtn, false);
  }
});


formRegister.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.activeElement && document.activeElement.name === 'role') {
   
    e.preventDefault();
  }
});

// ---------------- Pop up ----------------------
function showError(message, err) {
  let alertMessage = document.querySelector("#alert-message");
  alertMessage.innerHTML = createAlert("danger", message, err);

  setTimeout(() => {
    alertMessage.innerHTML = "";
  }, 3000);
}


function showSuccess(message) {
  let alertMessage = document.querySelector("#alert-message");
  alertMessage.innerHTML = createAlert("success", message);

  setTimeout(() => {
    alertMessage.innerHTML = "";
  }, 3000);
}

