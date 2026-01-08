const CONFIG = {
  TREASURY_ADDRESS: "9fTSmYKqZXLsyLvqDUbSwjZ7bMJMig9coSpbRdQunEo68sWyn4t",
  ENTRY_FEE_ERG: "0.5"
};

const TransactionManager = {
  _pending: false,

  // Utility per attendere
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  async connect() {
    if (typeof ergoConnector === "undefined" || !ergoConnector.nautilus) {
      alert("Nautilus wallet non trovato!");
      return false;
    }
    const connected = await ergoConnector.nautilus.connect();
    await this.sleep(500); // Aspetta che la connessione si stabilizzi
    return connected;
  },

  async ensureConnection() {
    try {
      // Verifica se la connessione è ancora attiva
      await ergo.get_change_address();
      return true;
    } catch (e) {
      console.log("Connessione persa, riconnetto...");
      return await this.connect();
    }
  },

  async payEntryFee() {
    if (this._pending) return null;
    this._pending = true;

    try {
      const connected = await this.ensureConnection();
      if (!connected) return null;

      await this.sleep(300); // Pausa dopo la connessione

      // Recupera l'indirizzo
      let changeAddr;
      try {
        const addr = await ergo.get_change_address();
        changeAddr = Array.isArray(addr) ? addr[0] : addr;
      } catch (e) {
        const addrs = await ergo.get_used_addresses();
        changeAddr = Array.isArray(addrs) ? addrs[0] : addrs;
      }

      await this.sleep(200); // Pausa dopo recupero indirizzo

      if (!changeAddr || typeof changeAddr !== 'string' || !changeAddr.startsWith('9')) {
        throw new Error("Indirizzo wallet non valido. Assicurati che Nautilus sia connesso alla mainnet.");
      }

      const amountNano = "500000000"; // 0.5 ERG
      const feeNano = "1100000";
      const totalNeeded = "501100000";

      const utxos = await ergo.get_utxos(totalNeeded);
      await this.sleep(200);

      const currentHeight = await ergo.get_current_height();
      await this.sleep(200);

      if (!utxos || utxos.length === 0) {
        alert("Fondi insufficienti (minimo 0.5011 ERG richiesti).");
        return null;
      }

      const unsignedTx = {
        inputs: utxos,
        dataInputs: [],
        outputs: [
          {
            address: CONFIG.TREASURY_ADDRESS.trim(),
            value: amountNano,
            assets: []
          }
        ],
        changeAddress: changeAddr.trim(),
        fee: feeNano,
        creationHeight: parseInt(currentHeight)
      };

      console.log("✅ Indirizzo change verificato:", changeAddr);
      console.log("📝 Transazione non firmata:", unsignedTx);

      await this.sleep(300); // Pausa importante prima della firma

      const signedTx = await ergo.sign_tx(unsignedTx);
      await this.sleep(300);

      const txId = await ergo.submit_tx(signedTx);
      
      console.log("✅ Transazione inviata! ID:", txId);
      return txId;

    } catch (e) {
      console.error("❌ Errore firma:", e);
      
      // Log dettagliato dell'errore
      if (e.code) console.log("Codice errore:", e.code);
      if (e.info) console.log("Info errore:", e.info);
      if (e.message) console.log("Messaggio:", e.message);
      
      const msg = e.info || e.message || "Errore sconosciuto";
      
      if (e.code === 2) {
        console.log("ℹ️ Utente ha annullato.");
      } else if (msg.includes("tab") || msg.includes("port")) {
        alert("Errore di connessione con Nautilus. Riprova o ricarica la pagina.");
      } else {
        alert("Errore: " + msg);
      }
      return null;

    } finally {
      this._pending = false;
    }
  }
};

// Esporta per uso globale
window.TransactionManager = TransactionManager;
