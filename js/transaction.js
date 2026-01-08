/* =========================
   CONFIG
========================= */
const CONFIG = {
  TREASURY_ADDRESS: "9fTSmYKqZXLsyLvqDUbSwjZ7bMJMig9coSpbRdQunEo68sWyn4t".trim(),
  ENTRY_FEE_ERG: 0.5
};

/* =========================
   TRANSACTION MANAGER
========================= */
const TransactionManager = {
  _pending: false,

  async connect() {
    if (typeof ergoConnector === "undefined" || !ergoConnector.nautilus) {
      alert("Nautilus wallet non installato!");
      return false;
    }
    const ok = await ergoConnector.nautilus.connect();
    return ok;
  },

  async getAddress() {
    try {
      return await ergo.get_change_address();
    } catch (e) {
      return "00000000";
    }
  },

  async payEntryFee() {
    if (this._pending) return null;
    this._pending = true;

    try {
      // Assicuriamoci che il wallet sia connesso
      const connected = await this.connect();
      if (!connected) throw new Error("Wallet non connesso");

      // Calcoli in NanoErg
      const amountNano = (BigInt(CONFIG.ENTRY_FEE_ERG * 1000) * BigInt(1e6)).toString();
      const feeNano = "1100000"; // 0.0011 ERG standard fee
      const totalNeeded = (BigInt(amountNano) + BigInt(feeNano)).toString();

      // Recupero dati necessari
      const userAddress = await ergo.get_change_address();
      const currentHeight = await ergo.get_current_height();
      const utxos = await ergo.get_utxos(totalNeeded);

      if (!utxos || utxos.length === 0) {
        alert("Saldo insufficiente per coprire 0.5 ERG + commissioni.");
        return null;
      }

      /* COSTRUZIONE TRANSAZIONE RIGOROSA 
         Passiamo i valori numerici come STRINGHE per evitare il bug 'startsWith'
      */
      const unsignedTx = {
        inputs: utxos,
        dataInputs: [],
        outputs: [{
          address: CONFIG.TREASURY_ADDRESS,
          value: amountNano, // Stringa
          assets: []
        }],
        changeAddress: userAddress,
        fee: feeNano, // Stringa
        creationHeight: parseInt(currentHeight)
      };

      console.log("Richiesta firma transazione...", unsignedTx);

      // Firma e Invio
      const signedTx = await ergo.sign_tx(unsignedTx);
      const txId = await ergo.submit_tx(signedTx);

      console.log("Transazione inviata con successo! ID:", txId);
      return txId;

    } catch (e) {
      console.error("Errore nel processo di pagamento:", e);
      
      // Gestione errore 'startsWith' o altri errori di validazione
      const errorMsg = e.info || e.message || "";
      
      if (e.code === 2 || errorMsg.includes("rejected")) {
        console.log("Firma annullata dall'utente.");
      } else {
        alert("Errore Nautilus: " + (errorMsg.includes("startsWith") 
          ? "Problema di validazione indirizzo. Riprova a ricaricare la pagina." 
          : errorMsg));
      }
      return null;
    } finally {
      this._pending = false;
    }
  }
};

// Debug per verificare l'integrità del caricamento
console.log("TransactionManager caricato correttamente.");
