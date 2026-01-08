const CONFIG = {
    TREASURY_ADDRESS: "9fTSmYKqZXLsyLvqDUbSwjZ7bMJMig9coSpbRdQunEo68sWyn4t",
    ENTRY_FEE_ERG: 0.5
};

const TransactionManager = {
    _pending: false,

    async connect() {
        if (typeof ergoConnector === 'undefined' || !ergoConnector.nautilus) {
            throw new Error("Nautilus non rilevato");
        }
        return await ergoConnector.nautilus.connect();
    },

    async payEntryFee() {
        if (this._pending) return null;
        this._pending = true;

        try {
            const isConnected = await this.connect();
            if (!isConnected) throw new Error("Connessione rifiutata");

            // 1. Costanti rigorose in NanoErgs (Stringhe per evitare precisione JS)
            const amountNano = "500000000"; // 0.5 ERG
            const feeNano = "1100000";    // 0.0011 ERG
            const totalRequired = "501100000";

            // 2. Recupero dati con validazione immediata
            const utxos = await ergo.get_utxos(totalRequired);
            if (!utxos || utxos.length === 0) {
                throw new Error("Fondi insufficienti (serve almeno 0.5011 ERG)");
            }

            const changeAddress = await ergo.get_change_address();
            const creationHeight = await ergo.get_current_height();

            // 3. COSTRUZIONE EIP-12 RIGOROSA
            // Rimuoviamo ogni campo opzionale (niente additionalRegisters, niente assets vuoti se non necessari)
            // Nautilus crasha se riceve campi nulli o formattati male.
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
                changeAddress: changeAddress,
                fee: feeNano,
                creationHeight: parseInt(creationHeight)
            };

            console.log("TX pronta per Nautilus:", unsignedTx);

            // 4. FIRMA E INVIO
            // Usiamo un try/catch specifico per la firma
            let signedTx;
            try {
                signedTx = await ergo.sign_tx(unsignedTx);
            } catch (e) {
                // Se Nautilus dà ancora 'startsWith', usiamo l'ultima risorsa:
                // l'invio semplificato che delega la costruzione all'estensione.
                if (e.info && e.info.includes("startsWith")) {
                    console.warn("Rilevato bug WASM Nautilus, provo fallback...");
                    return await ergo.pay_to_address(CONFIG.TREASURY_ADDRESS, amountNano);
                }
                throw e;
            }

            const txId = await ergo.submit_tx(signedTx);
            console.log("✅ Successo! TX ID:", txId);
            return txId;

        } catch (error) {
            console.error("ERGO SDK Error:", error);
            const msg = error.info || error.message || "Errore sconosciuto";
            if (error.code !== 2) alert("Errore Wallet: " + msg);
            return null;
        } finally {
            this._pending = false;
        }
    },

    async getAddress() {
        try {
            return await ergo.get_change_address();
        } catch (e) {
            return "";
        }
    }
};
