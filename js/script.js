const hunt = new TreasureHunt();
const output = document.getElementById("output");
const startBtn = document.getElementById("startGame");

/* =========================
   START GAME
========================= */

startBtn.addEventListener("click", async () => {
  try {
    // Tentativo di connessione iniziale
    const connected = await TransactionManager.connect();
    if (!connected) return;

    output.innerHTML = `
      <div class="level-box">
        <h3>Preparati alla sfida</h3>
        <p>Scegli quanto vuoi puntare per questa partita.</p>
        
        <div style="margin: 20px 0;">
          <label style="display: block; margin-bottom: 10px; font-weight: bold;">
            Importo Puntata (ERG):
          </label>
          <input 
            type="number" 
            id="betAmount" 
            value="0.5" 
            step="0.1" 
            min="0.1" 
            style="padding: 10px; width: 80px; text-align: center; font-size: 1.1rem;"
          />
        </div>

        <p><small>Minimo: 0.1 ERG. I premi dipendono dalla tua puntata!</small></p>
        <button id="payBtn">Paga e Inizia</button>
      </div>
    `;

    const payBtn = document.getElementById("payBtn");
    const betInput = document.getElementById("betAmount");

    payBtn.addEventListener("click", async () => {
      const amount = parseFloat(betInput.value);

      // Validazione locale dell'importo
      if (isNaN(amount) || amount < 0.1) {
        alert("Inserisci un importo valido (minimo 0.1 ERG)");
        return;
      }

      payBtn.disabled = true;
      payBtn.innerText = "Attesa firma...";

      // Passiamo l'importo dinamico al manager
      const txId = await TransactionManager.payEntryFee(amount);

      if (txId) {
        output.innerHTML = `
          <div class="loader"></div>
          <p>Pagamento inviato con successo!</p>
          <p><small>ID: ${txId.substring(0, 10)}...</small></p>
          <p>Caricamento enigmi in corso...</p>
        `;

        // Simuliamo un piccolo ritardo per permettere al wallet di processare
        setTimeout(async () => {
          const levels = await generateRandomGame();
          if (levels) {
            hunt.levels = levels;
            loadLevel();
          }
        }, 1500);
        
      } else {
        payBtn.disabled = false;
        payBtn.innerText = "Paga e Inizia";
      }
    });

  } catch (e) {
    console.error(e);
    alert("Errore di connessione o operazione annullata.");
  }
});

/* =========================
   GAME LOGIC (Invariata)
========================= */

function loadLevel() {
  const level = hunt.getCurrentLevel();

  output.innerHTML = `
    <div class="level-box">
      <div style="font-size: 0.8rem; color: #888;">
        DOMANDA ${level.id} DI 10
      </div>

      <p style="font-size: 1.2rem; margin: 20px 0;">
        <strong>${level.riddle}</strong>
      </p>

      <input
        type="text"
        id="ans"
        placeholder="Scrivi qui la risposta..."
        autocomplete="off"
      />

      <button id="checkBtn">Verifica Risposta</button>
    </div>
  `;

  document.getElementById("checkBtn").onclick = processAnswer;

  const input = document.getElementById("ans");
  input.focus();
  input.onkeypress = (e) => {
    if (e.key === "Enter") processAnswer();
  };
}

function processAnswer() {
  const val = document.getElementById("ans").value.trim();
  const result = hunt.checkAnswer(val);

  if (result.success) {
    if (result.finished) {
      showVictory();
    } else {
      loadLevel();
    }
  } else {
    alert("Risposta non corretta. Riprova!");
  }
}

/* =========================
   VICTORY
========================= */

async function showVictory() {
  const addr = await TransactionManager.getAddress();

  // Generiamo un codice vittoria che includa l'indirizzo per verifica
  const victoryCode = btoa(addr + "_ERGO_CHAMP")
    .substring(0, 14)
    .toUpperCase();

  output.innerHTML = `
    <div class="level-box">
      <h2 style="color: #4CAF50;">🏆 CAMPIONE!</h2>
      <p>Hai risolto tutti gli enigmi.</p>
      <p>Il tuo codice vittoria unico è:</p>

      <div style="
        background: #f0f0f0;
        padding: 15px;
        font-family: monospace;
        font-size: 1.2rem;
        margin: 15px 0;
        border: 2px dashed #4CAF50;
        word-break: break-all;
      ">
        ${victoryCode}
      </div>

      <p>Copia questo codice e invialo sul nostro canale Telegram per ricevere il premio proporzionale alla tua puntata!</p>
      <button onclick="location.reload()">Gioca Ancora</button>
    </div>
  `;
}
