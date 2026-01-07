const CONFIG = {
    // IMPORTANTE: Per testare, usa un indirizzo diverso dal tuo se possibile, 
    // altrimenti Nautilus si confonde pagando se stesso.
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

    async getAddress() {
        return await ergo.get_change_address();
    },

    async payEntryFee() {
        try {
            // 1. Definiamo gli importi
            const paymentAmount = BigInt(Math.round(CONFIG.ENTRY_FEE_ERG * 1e9));
            const minerFee = BigInt(CONFIG.MINER_FEE_NANO);
            
            // 2. MODIFICA CRUCIALE: Non chiediamo l'importo esatto.
            // Chiediamo "undefined" per ottenere TUTTI gli UTXO disponibili (fino al limite del wallet).
            // Questo garantisce che il "Resto" sia grande abbastanza da essere valido.
            const utxos = await ergo.get_utxos(); 

            if (!utxos || utxos.length === 0) {
                alert("Wallet vuoto o non sincronizzato.");
                return null;
            }

            const userAddress = await ergo.get_change_address();
            const currentHeight = await ergo.get_current_height();

            // 3. Costruiamo la transazione
            const unsignedTx = {
                inputs: utxos, // Usiamo tutti gli input trovati per avere un resto valido
                dataInputs: [],
                outputs: [
                    {
                        address: CONFIG.TREASURY_ADDRESS,
                        value: paymentAmount.toString(),
                        assets: [],
                        additionalRegisters: {}
                    }
                ],
                changeAddress: userAddress, // Qui finirà il resto abbondante
                fee: minerFee.toString(),
                assetsToBurn: [],
                creationHeight: currentHeight
            };

            console.log("Generazione transazione con input abbondanti...", unsignedTx);

            const signedTx = await ergo.sign_tx(unsignedTx);
            const txId = await ergo.submit_tx(signedTx);
            
            console.log("✅ Pagamento riuscito! ID:", txId);
            return txId;

        } catch (e) {
            console.error("Errore:", e);
            // Gestione errori specifica
            if (e.info && e.info.includes("Output amount is too small")) {
                alert("ERRORE DUST: Il tuo wallet ha troppi spiccioli sparsi. Vai su Nautilus -> Settings -> Wallet Optimization.");
            } else {
                alert("Errore: " + (e.message || e.info || "Firma annullata o fallita"));
            }
            return null;
        }
    }
};
