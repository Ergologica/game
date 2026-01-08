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

      // 1. Recuperiamo gli indirizzi del wallet in modo esplicito
      // get_unused_addresses o get_change_address a volte restituiscono array o stringhe a seconda della versione
      const availableAddresses = await ergo.get_change_address();
      const changeAddr = Array.isArray(availableAddresses) ? availableAddresses[0] : availableAddresses;

      if (!changeAddr) {
        throw new Error("Impossibile recuperare l'indirizzo del wallet. Riconnetti Nautilus.");
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

      // 2. COSTRUZIONE ULTRA-PULITA
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
        // FORZIAMO il changeAddress a essere una stringa pulita
        changeAddress: changeAddr.toString().trim(),
        fee: feeNano,
        creationHeight: parseInt(currentHeight)
      };

      console.log("Richiesta firma con indirizzo verificato:", changeAddr);

      const signedTx = await ergo.sign_tx(unsignedTx);
      const txId = await ergo.submit_tx(signedTx);

      console.log("Transazione inviata! ID:", txId);
      return txId;

    } catch (e) {
      console.error("Errore firma:", e);
      const msg = e.info || e.message || "";
      
      if (e.code === 2) {
        console.log("Utente ha annullato.");
      } else {
        alert("Errore tecnico: " + msg);
      }
      return null;
    } finally {
      this._pending = false;
    }
  }
};
