const CONFIG = {
    TREASURY_ADDRESS: "9fTSmYKqZXLsyLvqDUbSwjZ7bMJMig9coSpbRdQunEo68sWyn4t",
    ENTRY_FEE_ERG: 0.5
};

const TransactionManager = {
    async connect() {
        if (typeof ergoConnector !== 'undefined' && ergoConnector.nautilus) {
            return await ergoConnector.nautilus.connect();
        }
        alert("Nautilus Wallet non trovato!");
        return false;
    },

    async getAddress() {
        return await ergo.get_change_address();
    },

    async payEntryFee() {
        try {
            const userAddress = await ergo.get_change_address();
            const utxos = await ergo.get_utxos();
            
            if (!utxos || utxos.length === 0) {
                throw new Error("Il tuo wallet sembra vuoto o non sincronizzato.");
            }

            const amountNano = (CONFIG.ENTRY_FEE_ERG * 1000000000).toString();

            // Costruzione manuale della transazione (Schema EIP-12)
            const unsignedTx = {
                inputs: utxos,
                dataInputs: [],
                outputs: [
                    {
                        address: CONFIG.TREASURY_ADDRESS,
                        value: amountNano,
                        assets: []
                    }
                ],
                changeAddress: userAddress,
                fee: "1100000", // 0.0011 ERG
                assetsToBurn: []
            };

            console.log("Inviando richiesta di firma...");
            
            // Chiamata standard supportata da tutte le versioni
            const signedTx = await ergo.sign_tx(unsignedTx);
            const txId = await ergo.submit_tx(signedTx);
            
            console.log("Transazione sottomessa con successo ID:", txId);
            return txId;

        } catch (e) {
            console.error("Errore firma transazione:", e);
            const msg = e.info || e.message || "Errore sconosciuto";
            alert("Errore Nautilus: " + msg);
            return null;
        }
    }
};
