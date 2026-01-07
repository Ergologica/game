const CONFIG = {
    TREASURY_ADDRESS: "9fTSmYKqZXLsyLvqDUbSwjZ7bMJMig9coSpbRdQunEo68sWyn4t",
    ENTRY_FEE_ERG: 0.5,
    MINER_FEE_NANO: "1100000" // 0.0011 ERG
};

const TransactionManager = {
    async connect() {
        if (typeof ergoConnector !== 'undefined' && ergoConnector.nautilus) {
            const connected = await ergoConnector.nautilus.connect();
            return connected;
        }
        alert("Nautilus Wallet non trovato! Assicurati di aver installato l'estensione.");
        return false;
    },

    async getAddress() {
        try {
            return await ergo.get_change_address();
        } catch (e) {
            console.error("Impossibile recuperare l'indirizzo:", e);
            return null;
        }
    },

    async payEntryFee() {
        try {
            // 1. Calcoli preliminari in NanoErgs (evitiamo errori virgola mobile)
            // 0.5 ERG = 500.000.000 nanoErgs
            const paymentAmount = BigInt(Math.round(CONFIG.ENTRY_FEE_ERG * 1e9));
            const minerFee = BigInt(CONFIG.MINER_FEE_NANO);
            const totalNeeded = paymentAmount + minerFee;

            // 2. Ottimizzazione: Richiediamo solo gli UTXO necessari
            // Questo previene il crash se il wallet ha troppe "monetine" (dust)
            const utxos = await ergo.get_utxos(totalNeeded.toString());

            if (!utxos || utxos.length === 0) {
                alert(`Fondi insufficienti! Hai bisogno di almeno ${Number(totalNeeded)/1e9} ERG.`);
                return null;
            }

            // 3. Dati contestuali necessari per una TX valida
            const userAddress = await ergo.get_change_address();
            const currentHeight = await ergo.get_current_height(); // Importante per la validità

            // 4. Costruzione Transazione (Standard EIP-12 rigoroso)
            const unsignedTx = {
                inputs: utxos,
                dataInputs: [],
                outputs: [
                    {
                        address: CONFIG.TREASURY_ADDRESS,
                        value: paymentAmount.toString(),
                        assets: [], // Array vuoto vitale per evitare errori .length
                        additionalRegisters: {}
                    }
                ],
                changeAddress: userAddress,
                fee: minerFee.toString(),
                assetsToBurn: [],
                creationHeight: currentHeight // Aggiunto per stabilità
            };

            console.log("Transazione costruita, richiesta firma...", unsignedTx);

            // 5. Firma e Invio
            const signedTx = await ergo.sign_tx(unsignedTx);
            const txId = await ergo.submit_tx(signedTx);

            console.log("✅ Successo! TX ID:", txId);
            return txId;

        } catch (e) {
            console.error("❌ Errore critico nel processo di pagamento:", e);
            
            let msg = "Errore sconosciuto";
            if (e.info) msg = e.info;
            else if (e.message) msg = e.message;
            
            // Gestione specifica dell'errore utente
            if (msg.includes("User rejected") || e.code === 2) {
                alert("Hai annullato la transazione.");
            } else {
                alert("Errore tecnico Nautilus: " + msg);
            }
            return null;
        }
    }
};
