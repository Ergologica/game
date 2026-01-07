const CONFIG = {
    // Il tuo indirizzo di destinazione
    TREASURY_ADDRESS: "9fTSmYKqZXLsyLvqDUbSwjZ7bMJMig9coSpbRdQunEo68sWyn4t",
    ENTRY_FEE_ERG: "0.5",
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
            const amountNano = "500000000";
            const feeNano = CONFIG.MINER_FEE_NANO;
            const totalNeeded = (BigInt(amountNano) + BigInt(feeNano)).toString();

            // 1. Recupero dati base
            const userAddress = await ergo.get_change_address();
            const rawUtxos = await ergo.get_utxos(totalNeeded);
            const currentHeight = await ergo.get_current_height();

            if (!rawUtxos || rawUtxos.length === 0) {
                alert("Fondi insufficienti.");
                return null;
            }

            // 2. Costruzione Output ultra-pulita
            // Se l'errore è 'startsWith', forziamo l'indirizzo come stringa pura
            const targetAddress = String(CONFIG.TREASURY_ADDRESS).trim();

            const unsignedTx = {
                inputs: rawUtxos,
                dataInputs: [],
                outputs: [
                    {
                        address: targetAddress,
                        value: amountNano,
                        assets: []
                    }
                ],
                changeAddress: userAddress,
                fee: feeNano,
                creationHeight: parseInt(currentHeight)
            };

            console.log("TX pronta per la firma. Se non vedi i dettagli, prova a cliccare comunque su Sign.");

            // 3. Firma
            const signedTx = await ergo.sign_tx(unsignedTx);
            const txId = await ergo.submit_tx(signedTx);
            
            console.log("✅ Pagamento inviato! ID:", txId);
            return txId;

        } catch (e) {
            console.error("Errore firma:", e);
            // Se vedi 'startsWith' qui, il problema è la versione di Nautilus
            if (e.code !== 2) {
                alert("Errore tecnico: " + (e.info || e.message));
            }
            return null;
        }
    }
};
