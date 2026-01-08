const CONFIG = {
  TREASURY_ADDRESS: "9fTSmYKqZXLsyLvqDUbSwjZ7bMJMig9coSpbRdQunEo68sWyn4t",
  ENTRY_FEE_ERG: "0.5"
};

const TransactionManager = {
  _pending: false,

  async connect() {
    if (typeof ergoConnector === "undefined" || !ergoConnector.nautilus) {
      alert("Nautilus wallet non trovato!");
      return false;
    }
    return await ergoConnector.nautilus.connect();
  },

  async payEntryFee() {
    if (this._pending) return null;
    this._pending = true;

    try {
      const connected = await this.connect();
      if (!connected) return null;

      // Recupera l'indirizzo in formato corretto
      let changeAddr;
      try {
        // Prova prima con get_change_address
        const addr = await ergo.get_change_address();
        changeAddr = Array.isArray(addr) ? addr[0] : addr;
      } catch (e) {
        // Fallback su get_used_addresses
        const addrs = await ergo.get_used_addresses();
        changeAddr = Array.isArray(addrs) ? addrs[0] : addrs;
      }

      // VERIFICA CRITICA: l'indirizzo deve iniziare con "9" (mainnet)
      if (!changeAddr || typeof changeAddr !== 'string' || !changeAddr.startsWith('9')) {
        throw new Error("Indirizzo wallet non valido. Assicurati che Nautilus sia connesso alla mainnet.");
      }

      const amountNano = "500000000"; // 0.5 ERG
      const feeNano = "1100000";
      const totalNeeded = "501100000";

      const utxos = await ergo.get_utxos(totalNeeded);
      const currentHeight = await ergo.get_current_height();

      if (!utxos || utxos.length === 0) {
        alert("Fondi insufficienti (minimo 0.5011 ERG richiesti).");
        return null;
      }

      // Costruzione della transazione
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

      const signedTx = await ergo.sign_tx(unsignedTx);
      const txId = await ergo.submit_tx(signedTx);
      
      console.log("✅ Transazione inviata! ID:", txId);
      return txId;

    } catch (e) {
      console.error("❌ Errore firma:", e);
      const msg = e.info || e.message || "";
      
      if (e.code === 2) {
        console.log("ℹ️ Utente ha annullato.");
      } else {
        alert("Errore tecnico: " + msg);
      }
      return null;

    } finally {
      this._pending = false;
    }
  }
};
