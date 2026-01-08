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

            const amountNano = "500000000"; // 0.5 ERG
            const feeNano = "1100000";    // 0.0011 ERG
            const totalRequired = "501100000";

            // 1. Recupero dati
            const rawUtxos = await ergo.get_utxos(totalRequired);
            if (!rawUtxos || rawUtxos.length === 0) {
                throw new Error("Fondi insufficienti");
            }

            const changeAddress = await ergo.get_change_address();
            const creationHeight = await ergo.get_current_height();

            // 2. DEEP CLEAN DEGLI UTXO
            // Rimuoviamo qualsiasi campo che non sia boxId, value, ergoTree, ecc.
            // Questo previene il crash 'startsWith' del validatore Rust
            const cleanInputs = rawUtxos.map(utxo => ({
                boxId: utxo.boxId,
                value: utxo.value.toString(),
                ergoTree: utxo.ergoTree,
                assets: utxo.assets || [],
                additionalRegisters: utxo.additionalRegisters || {},
                creationHeight: utxo.creationHeight,
                transactionId: utxo.transactionId,
                index: utxo.index
            }));

            // 3. Costruzione Transazione "Barebone"
            const unsignedTx = {
                inputs: cleanInputs,
                dataInputs: [],
                outputs: [
                    {
                        address: CONFIG.TREASURY_ADDRESS.trim(),
                        value: amountNano,
                        assets: []
                    }
                ],
                changeAddress: Array.isArray(changeAddress) ? changeAddress[0] : changeAddress,
                fee: feeNano,
                creationHeight: parseInt(creationHeight)
            };

            console.log("Inviando TX pulita a Nautilus...");

            // 4. FIRMA (Utilizzando solo sign_tx che è universale)
            const signedTx = await ergo.sign_tx(unsignedTx);
            const txId = await ergo.submit_tx(signedTx);
            
            console.log("✅ Successo! ID:", txId);
            return txId;

        } catch (error) {
            console.error("Dettaglio Errore:", error);
            const msg = error.info || error.message || "Errore sconosciuto";
            
            // Se l'errore persiste, è un problema di sincronizzazione dell'estensione
            if (error.code !== 2) {
                alert("Errore Wallet: " + msg + "\n\nSuggerimento: Se vedi ancora 'startsWith', vai nelle impostazioni di Nautilus e clicca su 'Resync'.");
            }
            return null;
        } finally {
            this._pending = false;
        }
    },

    async getAddress() {
        try {
            const addr = await ergo.get_change_address();
            return Array.isArray(addr) ? addr[0] : addr;
        } catch (e) {
            return "";
        }
    }
};
