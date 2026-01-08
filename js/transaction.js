const CONFIG = {
  TREASURY_ADDRESS: "9fTSmYKqZXLsyLvqDUbSwjZ7bMJMig9coSpbRdQunEo68sWyn4t",
  ENTRY_FEE_ERG: 0.5
};

const TransactionManager = {
  _pending: false,

  async connect() {
    if (typeof ergoConnector === "undefined" || !ergoConnector.nautilus) {
      alert("Nautilus wallet non installato!");
      return false;
    }
    return await ergoConnector.nautilus.connect();
  },

  async getAddress() {
    try {
      return await ergo.get_change_address();
    } catch (e) {
      return "Indirizzo non trovato";
    }
  },

  async payEntryFee() {
    if (this._pending) return null;
    this._pending = true;

    try {
      const connected = await this.connect();
      if (!connected) return null;

      // Importo in NanoErg come stringa
      const amountNano = "500000000"; 

      console.log("Inviando richiesta di pagamento diretta...");

      /* UTILIZZO DI pay_to_address:
         Questo metodo è più "robusto" perché Nautilus costruisce la TX internamente.
         Se questo fallisce, il problema è nella sincronizzazione del Wallet.
      */
      const txId = await ergo.pay_to_address(CONFIG.TREASURY_ADDRESS, amountNano);

      console.log("Transazione inviata! ID:", txId);
      return txId;

    } catch (e) {
      console.error("Errore firma:", e);
      const msg = e.info || e.message || "";
      
      if (e.code === 2 || msg.includes("rejected")) {
        console.log("Utente ha annullato.");
      } else {
        alert("Errore Nautilus: " + msg);
      }
      return null;
    } finally {
      this._pending = false;
    }
  }
};
