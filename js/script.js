const hunt = new TreasureHunt();
const output = document.getElementById('output');
const startBtn = document.getElementById('startGame');

startBtn.addEventListener('click', async () => {
    const connected = await TransactionManager.connect();
    if (!connected) return;

    output.innerHTML = `
        <div class="level-box">
            <h3>Preparati alla sfida</h3>
            <p>Per iniziare è richiesto il pagamento di <strong>0.5 ERG</strong>.</p>
            <p><small>Il pagamento verrà inviato al tesoro per finanziare i premi.</small></p>
            <button id="payBtn">Paga e Inizia</button>
        </div>
    `;

    document.getElementById('payBtn').onclick = async () => {
        const btn = document.getElementById('payBtn');
        btn.disabled = true;
        btn.innerText = "Attesa firma...";

        const txId = await TransactionManager.payEntryFee();

        if (txId) {
            output.innerHTML = "<div class='loader'></div><p>Pagamento confermato! Caricamento enigmi...</p>";
            const levels = await generateRandomGame();
            if (levels) {
                hunt.levels = levels;
                loadLevel();
            }
        } else {
            btn.disabled = false;
            btn.innerText = "Paga e Inizia";
        }
    };
});

function loadLevel() {
    const level = hunt.getCurrentLevel();
    output.innerHTML = `
        <div class="level-box">
            <div style="font-size: 0.8rem; color: #888;">DOMANDA ${level.id} DI 10</div>
            <p style="font-size: 1.2rem; margin: 20px 0;"><strong>${level.riddle}</strong></p>
            <input type="text" id="ans" placeholder="Scrivi qui la risposta..." autocomplete="off">
            <button id="checkBtn">Verifica Risposta</button>
        </div>
    `;

    document.getElementById('checkBtn').onclick = processAnswer;
    const input = document.getElementById('ans');
    input.focus();
    input.onkeypress = (e) => { if(e.key === 'Enter') processAnswer(); };
}

function processAnswer() {
    const val = document.getElementById('ans').value;
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

async function showVictory() {
    const addr = await TransactionManager.getAddress();
    const victoryCode = btoa(addr + "ERGO_PRO").substring(0, 12).toUpperCase();
    output.innerHTML = `
        <div class="level-box">
            <h2 style="color: #4CAF50;">🏆 CAMPIONE!</h2>
            <p>Hai superato tutti i livelli.</p>
            <p>Il tuo codice vittoria unico è:</p>
            <div style="background: #f0f0f0; padding: 15px; font-family: monospace; font-size: 1.5rem; margin: 15px 0; border: 2px dashed #ccc;">
                ${victoryCode}
            </div>
            <p>Inviaci questo codice per riscattare il premio!</p>
        </div>
    `;
}