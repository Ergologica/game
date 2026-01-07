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
                alert("Wallet vuoto o non sincronizzato.");
                return null;
            }

            // Conversione precisa in stringa per nanoErgs
            const amountNano = (CONFIG.ENTRY_FEE_ERG * 1000000000).toString();

            // COSTRUZIONE TRANSAZIONE RIGIDA (EIP-12)
            const txToSign = {
                inputs: utxos,
                dataInputs: [],
                outputs: [
                    {
                        address: CONFIG.TREASURY_ADDRESS,
                        value: amountNano,
                        assets: [] // Questo evita l'errore .length in Nautilus
                    }
                ],
                changeAddress: userAddress,
                fee: "1100000", // 0.0011 ERG
                assetsToBurn: []
            };

            // Chiamata alla firma
            const signedTx = await ergo.sign_tx(txToSign);
            
            // Invio
            const txId = await ergo.submit_tx(signedTx);
            console.log("Successo! TX ID:", txId);
            return txId;

        } catch (e) {
            console.error("Errore critico transazione:", e);
            // Se fallisce ancora, usiamo l'ultima risorsa: l'API semplificata
            return await this.fallbackSimplePay();
        }
    },

    async fallbackSimplePay() {
        try {
            const amountNano = (CONFIG.ENTRY_FEE_ERG * 1000000000).toString();
            // Metodo alternativo supportato da alcune versioni di Nautilus
            return await ergo.pay_to_address(CONFIG.TREASURY_ADDRESS, amountNano);
        } catch (e) {
            alert("Impossibile procedere al pagamento. Verifica i fondi nel wallet.");
            return null;
        }
    }
};
