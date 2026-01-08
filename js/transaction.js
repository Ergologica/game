const CONFIG = {
  TREASURY_ADDRESS: "9fTSmYKqZXLsyLvqDUbSwjZ7bMJMig9coSpbRdQunEo68sWyn4t",
  ENTRY_FEE_ERG: 0.5
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

      // Conversione sicura in stringhe per evitare errori di tipo
      const amountNano = "500000000"; 
      const feeNano = "1100000";
      const totalNeeded = "501100000";

      const userAddress = await ergo.get_change_address();
      const currentHeight = await ergo.get_current_height();
      
      // Chiediamo solo gli UTXO strettamente necessari
      const utxos = await ergo.get_utxos(totalNeeded);

      if (!utxos || utxos.length === 0) {
        alert("Saldo insufficiente (serve almeno 0.5011 ERG).");
        return null;
      }

      // COSTRUZIONE MANUALE MINIMALE
      // Nota: usiamo ESATTAMENTE i campi che Nautilus richiede per non mandarlo in crash
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
        changeAddress: userAddress,
        fee: feeNano,
        creationHeight: parseInt(currentHeight)
      };

      console.log("Richiesta firma manuale...");
      
      // sign_tx è la funzione standard che deve esistere per forza
      const signedTx = await ergo.sign_tx(unsignedTx);
      const txId = await ergo.submit_tx(signedTx);

      console.log("Successo! ID:", txId);
      return txId;

    } catch (e) {
      console.error("Errore:", e);
      const msg = e.info || e.message || "";
      if (e.code !== 2) alert("Errore: " + msg);
      return null;
    } finally {
      this._pending = false;
    }
  }
};
