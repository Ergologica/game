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

      // Importi forzati come stringhe (evita bug di precisione JS)
      const amountNano = "500000000"; 
      const feeNano = "1100000";
      const totalNeeded = "501100000";

      const userAddress = await ergo.get_change_address();
      const currentHeight = await ergo.get_current_height();
      
      // Chiediamo gli UTXO necessari
      const utxos = await ergo.get_utxos(totalNeeded);

      if (!utxos || utxos.length === 0) {
        alert("Fondi insufficienti (serve almeno 0.5011 ERG).");
        return null;
      }

      /* STRUTTURA ATOMICA: 
         Rimuoviamo additionalRegisters e forziamo assets come array vuoto.
         Questo impedisce a Nautilus di cercare proprietà 'undefined'.
      */
      const unsignedTx = {
        inputs: utxos,
        dataInputs: [],
        outputs: [
          {
            address: CONFIG.TREASURY_ADDRESS.trim(),
            value: amountNano,
            assets: [] // Obbligatorio
          }
        ],
        changeAddress: userAddress,
        fee: feeNano,
        creationHeight: parseInt(currentHeight)
      };

      console.log("Inviando richiesta di firma...");
      
      // Utilizziamo il metodo standard sign_tx
      const signedTx = await ergo.sign_tx(unsignedTx);
      const txId = await ergo.submit_tx(signedTx);

      console.log("Pagamento inviato! ID:", txId);
      return txId;

    } catch (e) {
      console.error("Dettaglio Errore:", e);
      const msg = e.info || e.message || "";
      
      if (e.code === 2 || msg.includes("rejected")) {
        console.log("Firma rifiutata dall'utente.");
      } else {
        alert("Errore Nautilus: " + msg);
      }
      return null;
    } finally {
      this._pending = false;
    }
  }
};
