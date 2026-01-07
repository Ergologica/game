const CONFIG = {
    TREASURY_ADDRESS: "9fTSmYKqZXLsyLvqDUbSwjZ7bMJMig9coSpbRdQunEo68sWyn4t",
    ENTRY_FEE_ERG: 0.5,
    MINER_FEE_NANO: "1100000" // 0.0011 ERG
};

const TransactionManager = {
    async connect() {
        if (typeof ergoConnector !== 'undefined' && ergoConnector.nautilus) {
            return await ergoConnector.nautilus.connect();
        }
        alert("Nautilus non trovato");
        return false;
    },

    async payEntryFee() {
        try {
            const amountNano = BigInt(Math.round(CONFIG.ENTRY_FEE_ERG * 1e9));
            const feeNano = BigInt(CONFIG.MINER_FEE_NANO);
            const totalNeeded = (amountNano + feeNano).toString();

            // 1. CHIEDIAMO SOLO GLI UTXO NECESSARI (Evita il crash dell'header)
            const utxos = await ergo.get_utxos(totalNeeded); 

            if (!utxos || utxos.length === 0) {
                alert("Fondi insufficienti o wallet non sincronizzato.");
                return null;
            }

            const userAddress = await ergo.get_change_address();
            const currentHeight = await ergo.get_current_height();

            // 2. COSTRUZIONE MINIMALE (Rimuoviamo campi opzionali che pesano)
            const unsignedTx = {
                inputs: utxos,
                dataInputs: [],
                outputs: [
                    {
                        address: CONFIG.TREASURY_ADDRESS,
                        value: amountNano.toString(),
                        assets: []
                    }
                ],
                changeAddress: userAddress,
                fee: feeNano.toString(),
                creationHeight: currentHeight
            };

            console.log("Richiesta firma per transazione ottimizzata...");

            // 3. FIRMA E INVIO
            const signedTx = await ergo.sign_tx(unsignedTx);
            const txId = await ergo.submit_tx(signedTx);
            
            console.log("✅ Pagamento riuscito! TX ID:", txId);
            return txId;

        } catch (e) {
            console.error("Dettaglio Errore:", e);
            // Se l'utente chiude la finestra, non mostrare alert fastidiosi
            if (e.code !== 2 && !e.info?.includes("rejected")) {
                alert("Errore durante la firma: " + (e.info || e.message));
            }
            return null;
        }
    }
};
