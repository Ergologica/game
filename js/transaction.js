const CONFIG = {
    TREASURY_ADDRESS: "9fTSmYKqZXLsyLvqDUbSwjZ7bMJMig9coSpbRdQunEo68sWyn4t",
    ENTRY_FEE_ERG: 0.5,
    MINER_FEE_NANO: "1100000"
};

const TransactionManager = {
    async connect() {
        if (typeof ergoConnector !== 'undefined' && ergoConnector.nautilus) {
            return await ergoConnector.nautilus.connect();
        }
        return false;
    },

    async payEntryFee() {
        try {
            // 1. Assicuriamoci che i valori siano STRINGHE pure
            const amountNano = "500000000"; // 0.5 ERG fisso per evitare calcoli JS
            const feeNano = CONFIG.MINER_FEE_NANO;
            const totalNeeded = (BigInt(amountNano) + BigInt(feeNano)).toString();

            const userAddress = await ergo.get_change_address();
            const utxos = await ergo.get_utxos(totalNeeded);
            const currentHeight = await ergo.get_current_height();

            // 2. Pulizia totale dell'oggetto (niente campi superflui)
            // L'errore startsWith spesso deriva da un campo 'value' passato come numero
            const unsignedTx = {
                inputs: utxos,
                dataInputs: [],
                outputs: [
                    {
                        address: CONFIG.TREASURY_ADDRESS.toString().trim(),
                        value: amountNano, // Deve essere stringa
                        assets: []
                    }
                ],
                changeAddress: userAddress.toString(),
                fee: feeNano, // Deve essere stringa
                creationHeight: parseInt(currentHeight)
            };

            console.log("Tentativo finale di firma...");
            const signedTx = await ergo.sign_tx(unsignedTx);
            const txId = await ergo.submit_tx(signedTx);
            
            return txId;

        } catch (e) {
            console.error("Errore firma:", e);
            // Ignoriamo il rifiuto utente, ma logghiamo errori tecnici
            if (e.code !== 2) {
                alert("Errore Nautilus: " + (e.info || "Problema di sincronizzazione"));
            }
            return null;
        }
    }
};
