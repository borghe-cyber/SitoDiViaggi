const express = require("express");
const morgan = require("morgan");
const session = require("express-session");
const path = require("path");
const LocalStrategy = require("passport-local").Strategy;
const passport = require("passport");
const { request, METHODS } = require("http");
const utentiDao = require("./UserDAO.js");
const depositoDAO = require("./DepositoDAO.js");

const app = express();
const port = 3000;

app.use(morgan("tiny"));
// serve le pagine del sito (stessa origine del backend: niente CORS)
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(session({
  secret: "yamaha",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Passport middleware // fisse
app.use(passport.initialize());
app.use(passport.session());


app.listen(port, () => {
  console.log(`Sito avviato su http://localhost:${port}`);
});
// controllo credenziali utente 
passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },

  function (email, password, done) {
    utentiDao.getUser(email, password)
      .then(({ utente, controllo }) => {
        if (!utente) {
          return done(null, false, { message: "Email sbagliata o non registrata" });
        } else if (controllo == false) {
          return done(null, false, { message: "Password sbagliata" });
        }
        return done(null, utente);
      })
      .catch((err) => {
        return done(err);
      });
  }));

// creare la sessione che mi fa rimanere loggato 
passport.serializeUser((utente, done) => {
  done(null, { id: utente.id, ruolo: utente.ruolo });
});

passport.deserializeUser(function (serializeUser, done) {
  utentiDao.getUserById(serializeUser.id)
    .then((utente) => {
      // utente non più esistente: sessione non valida, si prosegue come non loggati
      done(null, utente || false);
    })
    .catch((err) => {
      done(err);
    });
});

// consente l'accesso solo agli utenti loggati con ruolo admin
function soloAdmin(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: true, message: "Devi effettuare il login." });
  }
  if (req.user.ruolo !== "admin") {
    return res.status(403).json({ error: true, message: "Operazione riservata agli admin." });
  }
  next();
}

app.get("/utenti", (req, res) => {
  utentiDao.getAllUser()
    .then((utenti) => res.json(utenti))
    .catch((error) => res.status(500).json({ error: error.message }));
});

app.post("/registrazione", async (req, res) => {
  const { email, password, ruolo } = req.body;

  // basta che manchi UN campo per rifiutare la richiesta
  if (!email || !password || !ruolo) {
    return res.status(400).json({ message: "Compila tutti i campi." });
  }
  if (ruolo !== "user" && ruolo !== "admin") {
    return res.status(400).json({ message: "Ruolo non valido." });
  }

  try {
    if (await utentiDao.emailEsistente(email)) {
      return res.status(409).json({ message: "Esiste già un account con questa email." });
    }
    const id = await utentiDao.inserisciUtente({ email, password, ruolo });
    return res.status(201).json({ id, email, ruolo });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Errore nella registrazione." });
  }
});

// end point server ascolto porta 3000 
app.post("/login", function (req, res, next) {
  passport.authenticate("local", function (err, utente, info) {
    if (err) return next(err);
    if (!utente) return res.status(401).json(info);
    req.login(utente, function (err) {
      if (err) return next(err);
      return res.json({ email: utente.email, ruolo: utente.ruolo });
    });
  })(req, res, next);
});

app.get("/me", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ utente: req.user });   // passport mette l'utente in req.user
  } else {
    res.status(401).json({ utente: null });
  }
});

app.get("/logout", (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.json({ success: true });
  });
});

app.get("/api/attrazioni", async (req, res) => {
  try {
    const luogo = (req.query.luogo || "").trim();
    if (!luogo) {
      return res.status(400).json({ error: true, message: "Parametro 'luogo' obbligatorio " });
    }
    const lista = await depositoDAO.getTutteAttrazioni(luogo);
    return res.json(lista);
  } catch (err) {
    console.error("Errpre /api/attrazioni: ", err);
    return res.status(500).json({ error: true, message: "Errore server" });
  }
});


// aggiungere le attrazioni direttamente dal sito 
app.post("/inserisci/attrazione", soloAdmin, async (req, res) => {
  try {
    const { nome, tipo, epoca, descrizione, data, luogo, valutazione } = req.body;

    // validazioni minime
    if (!nome || !tipo || !luogo) {
      return res.status(400).json({ error: true, message: "Campi obbligatori: nome, tipo, luogo." });
    }
    if (!["monumenti", "eventi", "ristoranti"].includes(tipo)) {
      return res.status(400).json({ error: true, message: "Tipo non valido." });
    }

    const nuovo = await depositoDAO.inserisciAttrazione({
      nome,
      tipo,
      epoca: epoca ?? null,
      descrizione: descrizione ?? null,
      data: data ?? null,
      luogo,
      valutazione: valutazione ?? null
    });

    return res.status(201).json(nuovo);
  } catch (err) {
    console.error("Errore POST /api/attrazioni:", err);
    return res.status(500).json({ error: true, message: "Errore server." });
  }
});

app.post("/elimina", soloAdmin, async (req, res) => {
  try {
    const { listaElimina } = req.body;
    const risultato = await depositoDAO.eliminaAttrazioni(listaElimina);

    if (risultato) {
      return res.status(201).json(risultato);
    } else {
      return res.status(400).json(risultato);
    }
  } catch (err) {
    console.error("Errore POST /elimina:", err);
    return res.status(500).json({ error: true, message: "Errore server." });
  }
});

app.post("/ricerca", async (req, res) => {
  try {
    const ricercaUtente = req.body;
    const risultatoRicerca = await depositoDAO.ricercaAttrazioni(ricercaUtente);

    if (risultatoRicerca) {
      return res.status(201).json(risultatoRicerca);
    }
    else {
      return res.status(400).json(risultatoRicerca);
    }
  }
  catch (err) {
    console.error("Errore POST /ricerca:", err);
    return res.status(500).json({ error: true, message: "Errore server." });
  }
});