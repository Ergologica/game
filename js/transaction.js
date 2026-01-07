/* =========================
   CONFIG
========================= */

const CONFIG = {
  TREASURY_ADDRESS: "9fTSmYKqZXLsyLvqDUbSwjZ7bMJMig9coSpbRdQunEo68sWyn4t",
  ENTRY_FEE_ERG: 0.5
};

/* =========================
   TRANSACTION MANAGER
========================= */

const TransactionManager = {

  _pending: false,

  async connect() {
    if (typeof ergoConnector === "undefined" || !ergoConnector.nautilus) {
      throw new Error("Nautilus wallet non installato");
    }

    const ok = await ergoConnector.nautilus.connect();
    if (!ok) {
      throw new Error("Connessione al wallet rifiutata");
    }

    return true;
  },

  async payEntryFee() {
    if (this._pending) return null;
    this._pending = true;

    try {
      await this.connect();

      /* === Importi (NUMERI) === */
      const amountNano = Math.floor(CONFIG.ENTRY_FEE_ERG * 1e9); // 0.5 ERG
      const feeNano = 1_100_000; // 0.0011 ERG
      const totalNeeded = amountNano + feeNano;

      /* === Dati wallet === */
      const userAddress = await ergo.get_change_address();
      const currentHeight = await ergo.get_current_height();
      const utxos = await ergo.get_utxos(totalNeeded);

      if (!utxos || utxos.length === 0) {
        alert("Fondi insufficienti");
        return null;
      }

      /* === COSTRUZIONE TX CANONICA (NO ergoTree) === */
      const unsignedTx = {
        inputs: utxos,
        dataInputs: [],
        outputs: [{
          address: CONFIG.TREASURY_ADDRESS,
          value: amountNano,
          assets: [],
          additionalRegisters: {}
        }],
        changeAddress: userAddress,
        fee: feeNano,
        creationHeight: currentHeight
      };

      console.log("Unsigned TX:", unsignedTx);

      /* === Firma + submit === */
      const signedTx = await ergo.sign_tx(unsignedTx);
      const txId = await ergo.submit_tx(signedTx);

      console.log("Transazione inviata:", txId);
      return txId;

    } catch (e) {
      console.error("Errore transazione:", e);

      // code 2 = firma annullata dall’utente
      if (e?.code === 2) {
        console.log("Firma annullata dall’utente");
        return null;
      }

      alert("Errore: " + (e.info || e.message));
      return null;

    } finally {
      this._pending = false;
    }
  }
};

/* =========================
   DEBUG DI SICUREZZA
========================= */

// Deve stampare: undefined
console.log("DEBUG address_to_tree:", ergo?.address_to_tree);
