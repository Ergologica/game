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
            const nanoErgs = (CONFIG.ENTRY_FEE_ERG * 1000000000).toString();
            
            // 1. Otteniamo gli UTXO necessari
            const utxos = await ergo.get_utxos();
            
            // 2. Costruiamo la transazione in formato standard EIP-12
            const tx = {
                inputs: utxos,
                outputs: [
                    {
                        address: CONFIG.TREASURY_ADDRESS,
                        value: nanoErgs,
                        assets: [] // Obbligatorio per evitare errori di 'length'
                    }
                ],
                fee: "1100000", // 0.0011 ERG (fee standard)
                assetsToBurn: []
            };

            // 3. Chiediamo a Nautilus di firmare
            const signedTx = await ergo.sign_tx(tx);
            
            // 4. Inviamo la transazione alla rete
            const txId = await ergo.submit_tx(signedTx);
            
            console.log("Transazione inviata:", txId);
            return txId;
        } catch (e) {
            console.error("Dettaglio Errore:", e);
            if (e.info && e.info.includes("User rejected")) {
                alert("Hai annullato il pagamento.");
            } else {
                alert("Errore nella creazione della transazione. Verifica di avere almeno 0.502 ERG nel wallet.");
            }
            return null;
        }
    }
};