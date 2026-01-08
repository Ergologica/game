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
    try {
      const connected = await ergoConnector.nautilus.connect();
      await this.sleep(500); // Aspetta che la connessione si stabilizzi
      return connected;
    } catch (e) {
      console.error("Errore connect:", e);
      return false;
    }
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

  // Restituisce una stringa con l'indirizzo (o null)
  async _resolveChangeAddress() {
    try {
      let addr = await ergo.get_change_address();
      console.log("DEBUG: get_change_address ->", addr);

      if (!addr) {
        const addrs = await ergo.get_used_addresses();
        console.log("DEBUG: get_used_addresses ->", addrs);
        addr = Array.isArray(addrs) && addrs.length > 0 ? addrs[0] : addrs;
      }

      let resolved = null;
      if (Array.isArray(addr) && addr.length > 0) resolved = String(addr[0]);
      else if (typeof addr === "string") resolved = addr;
      else if (addr && typeof addr === "object" && addr.address) resolved = String(addr.address);

      if (!resolved) return null;
      return resolved.trim();
    } catch (e) {
      console.error("Errore risoluzione indirizzo:", e);
      return null;
    }
  },

  async payEntryFee() {
    if (this._pending) return null;
    this._pending = true;

    try {
      const connected = await this.ensureConnection();
      if (!connected) {
        this._pending = false;
        return null;
      }

      await this.sleep(300);

      const changeAddr = await this._resolveChangeAddress();
      console.log("✅ Indirizzo resolved:", changeAddr);

      await this.sleep(200);

      if (!changeAddr || typeof changeAddr !== 'string' || !String(changeAddr).startsWith('9')) {
        throw new Error("Indirizzo wallet non valido o non trovato. Assicurati che Nautilus sia connesso alla mainnet e che il browser abbia concesso l'accesso agli indirizzi.");
      }

      const amountNano = "500000000"; // 0.5 ERG
      const feeNano = "1100000";
      const totalNeeded = "501100000";

      const utxos = await ergo.get_utxos(totalNeeded);
      console.log("DEBUG: utxos raw ->", utxos);
      await this.sleep(200);

      const utxosArray = Array.isArray(utxos) ? utxos : [];
      const invalidUtxos = utxosArray.filter(u => !u || !u.boxId || typeof u.boxId !== 'string');
      if (invalidUtxos.length) {
        console.warn("Alcuni utxos non hanno boxId valido:", invalidUtxos);
      }
      const validUtxos = utxosArray.filter(u => u && typeof u.boxId === 'string');
      if (!validUtxos.length) {
        alert("Nessun UTXO valido trovato. Impossibile creare la transazione.");
        this._pending = false;
        return null;
      }

      const currentHeight = await ergo.get_current_height();
      await this.sleep(200);

      if (!validUtxos || validUtxos.length === 0) {
        alert("Fondi insufficienti (minimo 0.5011 ERG richiesti).");
        this._pending = false;
        return null;
      }

      // Prepariamo due possibili payload da provare con sign_tx
      const unsignedFull = {
        inputs: validUtxos,
        dataInputs: [],
        outputs: [
          {
            address: CONFIG.TREASURY_ADDRESS.trim(),
            value: amountNano, // lascio string per compatibilità
            assets: []
          }
        ],
        changeAddress: changeAddr.trim(),
        fee: feeNano,
        creationHeight: parseInt(currentHeight)
      };

      const unsignedBoxIds = {
        inputs: validUtxos.map(u => u.boxId), // alternativa: solo gli id
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

      console.log("📝 Transazione non firmata (full):", unsignedFull);

      await this.sleep(300);

      // Primo tentativo: payload completo
      let signedTx;
      try {
        signedTx = await ergo.sign_tx(unsignedFull);
        console.log("Firma avvenuta col payload full.");
      } catch (signErr1) {
        console.warn("sign_tx con payload 'full' fallito:", signErr1);
        // stampo payload alternativo e provo a usare inputs come array di boxId
        console.log("Provo alternativo payload (inputs come boxId):", unsignedBoxIds);
        try {
          signedTx = await ergo.sign_tx(unsignedBoxIds);
          console.log("Firma avvenuta col payload boxIds.");
        } catch (signErr2) {
          // log esteso e rilancio per la gestione degli errori a monte
          console.error("sign_tx fallito con entrambi i payload. signErr1:", signErr1, "signErr2:", signErr2);
          // rilanciamo l'errore migliore (signErr2 preferito se presente)
          throw signErr2 || signErr1;
        }
      }

      await this.sleep(300);

      const txId = await ergo.submit_tx(signedTx);

      console.log("✅ Transazione inviata! ID:", txId);
      this._pending = false;
      return txId;

    } catch (e) {
      console.error("❌ Errore firma / pagamento:", e);

      if (e.code) console.log("Codice errore:", e.code);
      if (e.info) console.log("Info errore:", e.info);
      if (e.message) console.log("Messaggio:", e.message);

      const msg = e.info || e.message || "Errore sconosciuto";
      alert("Errore transazione: " + msg);

      this._pending = false;
      return null;
    }
  },

  async getAddress() {
    const addr = await this._resolveChangeAddress();
    return addr || "";
  }
};

window.TransactionManager = TransactionManager;
