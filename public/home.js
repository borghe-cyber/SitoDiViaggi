window.addEventListener("DOMContentLoaded", () => {

    const logoutBtn = document.querySelector('.logoutBtn');
    const loginBtn = document.querySelector('.loginBtn');
    const wishBtn = document.querySelector('.wishBtn');

    const formRicerca = document.querySelector(".searchForm");
    const barraRicerca = formRicerca.querySelector('.barraRicerca');

    formRicerca.addEventListener("submit", (event) => {
        event.preventDefault();     // evita comportamenti involontari del browser
        const ricercaUtente = barraRicerca.value.trim();
        if (!ricercaUtente) return; // caso che non esiste 
        eseguiRicerca(ricercaUtente);
    });

    if (localStorage.getItem("loggedIn") === "true") {
        logoutBtn.style.display = "block";
        loginBtn.style.display = "none";
        wishBtn.classList.remove('hidden'); // faccio comparire la lista 

    } else { // quando non è loggato 
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
            localStorage.setItem("loggedIn", "false");
            localStorage.removeItem("userId");
            localStorage.removeItem("wishlist");
            logoutBtn.style.display = "none";
            loginBtn.style.display = "block";

            window.location.reload();// ricarico la pagina 
        })
    }
});

async function eseguiRicerca(ricercaUtente) {
    const res = await fetch("/ricerca", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ricercaUtente }),
    });

    if (!res.ok) throw new Error("Errore nella ricerca");

    const attrazzTrovate = await res.json();
    if (Array.isArray(attrazzTrovate) && attrazzTrovate.length > 0) {
        visualizzaRisultati(attrazzTrovate);
    }
}

function visualizzaRisultati(attrazzTrovate) {
    const corpoTabella = creatabellaRicerca();
    corpoTabella.innerHTML = "";
    attrazzTrovate.forEach((element) => {
        corpoTabella.appendChild(creaRiga(element));
    });
}

function creatabellaRicerca() {
    let dlg = document.getElementById("modal-add-row");
    if (!dlg) {
        dlg = document.createElement("dialog");
        dlg.id = "modal-add-row";
        dlg.innerHTML = `
    <form method="dialog" style="border:0; padding:0; margin:0">
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th></th>
          <th></th>
        </tr>
      </thead>
      <tbody class="tabellaRicerca">
      </tbody>
    </table>
    <button class="chiudiRisultati">Chiudi</button>
    </form>
  `;
        document.body.appendChild(dlg);

        dlg.querySelector(".chiudiRisultati").addEventListener("click", () => {
            dlg.close();
            const contenutoBarra = document.querySelector(".barraRicerca");
            if (contenutoBarra) {
                contenutoBarra.value = "";
                contenutoBarra.dispatchEvent(new Event("input", { bubbles: true }));
            }
        });  // chidere modal di ricerca
    }
    const tbody = dlg.querySelector(".tabellaRicerca");
    tbody.innerHTML = "";

    if (!dlg.open) {
        if (typeof dlg.showModal === "function") {
            dlg.showModal();
        } else {
            // fallback per browser senza <dialog>
            dlg.style.display = "block";
        }
    }

    return tbody;
}

function creaRiga(element) {
    const nuovariga = document.createElement("tr");
    nuovariga.dataset.id = element.id;

    if (element.tipo === "monumenti") {
        nuovariga.innerHTML = `
    <td class = "nomeMonumento">${element.nome}</td>
    <td class = "epocaMonumento">${element.epoca}</td>
    <td class = "descrizioneMonumento">${element.descrizione}</td>
    `;
    } else if (element.tipo === "eventi") {
        nuovariga.innerHTML = `
    <td class = "nomeEvento">${element.nome}</td>
    <td class = "dataEvento">${element.data}</td>
    <td class = "luogoEvento">${element.luogo}</td>
    `;
    } else {
        nuovariga.innerHTML = `
    <td class = "nomeRistorante">${element.nome}</td>
    <td class = "valutazioneRistorante">${element.valutazione}</td>
    `;
    }
    return nuovariga;
}