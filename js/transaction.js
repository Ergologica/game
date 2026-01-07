const CONFIG = {
  TREASURY_ADDRESS: "9fTSmYKqZXLsyLvqDUbSwjZ7bMJMig9coSpbRdQunEo68sWyn4t",
  ENTRY_FEE_ERG: 0.5
};

const TransactionManager = {

  async connect() {
    if (typeof ergoConnector === "undefined" || !ergoConnector.nautilus) {
      throw new Error("Nautilus wallet non trovato");
    }

    const connected = await ergoConnector.nautilus.connect();
    if (!connected) {
      throw new Error("Connessione al wallet rifiutata");
    }

    return true;
  },

  async payEntryFee() {
    try {
      await this.connect();

      // === Valori in nanoERG (NUMERI, non stringhe) ===
      const amountNano = Math.floor(CONFIG.ENTRY_FEE_ERG * 1e9);
      const feeNano = 1_100_000;
      const totalNeeded = amountNano + feeNano;

      // === Dati wallet ===
      const userAddress = await ergo.get_change_address();
      const currentHeight = await ergo.get_current_height();
      const utxos = await ergo.get_utxos(totalNeeded);

      if (!utxos || utxos.length === 0) {
        alert("Fondi insufficienti");
        return null;
      }

      // === Output canonico Ergo ===
      const treasuryTree = ergo.address_to_tree(CONFIG.TREASURY_ADDRESS);

      const unsignedTx = {
        inputs: utxos,
        dataInputs: [],
        outputs: [{
          ergoTree: treasuryTree,
          value: amountNano,
          assets: [],
          additionalRegisters: {}
        }],
        changeAddress: userAddress,
        fee: feeNano,
        creationHeight: currentHeight
      };

      console.log("Unsigned TX:", unsignedTx);

      // === Firma + submit ===
      const signedTx = await ergo.sign_tx(unsignedTx);
      const txId = await ergo.submit_tx(signedTx);

      console.log("TX inviata:", txId);
      return txId;

    } catch (e) {
      console.error("Errore transazione:", e);

      // Codice 2 = utente ha annullato
      if (e?.code === 2) {
        console.log("Firma annullata dall’utente");
        return null;
      }

      alert("Errore transazione: " + (e.info || e.message));
      return null;
    }
  }
};
