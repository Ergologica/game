const CONFIG = {
    // Usiamo .trim() per sicurezza totale contro spazi invisibili
    TREASURY_ADDRESS: "9fTSmYKqZXLsyLvqDUbSwjZ7bMJMig9coSpbRdQunEo68sWyn4t".trim(),
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
            // 1. Controllo preliminare connessione
            if (typeof ergo === 'undefined') {
                throw new Error("Wallet non connesso correttamente");
            }

            const amountNano = (BigInt(CONFIG.ENTRY_FEE_ERG * 1000) * BigInt(1e6)).toString();
            const feeNano = CONFIG.MINER_FEE_NANO;
            const totalNeeded = (BigInt(amountNano) + BigInt(feeNano)).toString();

            // 2. Otteniamo i dati necessari
            const userAddress = await ergo.get_change_address();
            const utxos = await ergo.get_utxos(totalNeeded);
            const currentHeight = await ergo.get_current_height();

            if (!utxos || utxos.length === 0) {
                alert("Fondi insufficienti nel wallet.");
                return null;
            }

            // 3. COSTRUZIONE RIGOROSA
            // L'errore 'startsWith' spesso deriva da un indirizzo passato male o un campo mancante
            const unsignedTx = {
                inputs: utxos,
                dataInputs: [],
                outputs: [
                    {
                        address: CONFIG.TREASURY_ADDRESS,
                        value: amountNano,
                        assets: [] // Deve essere un array vuoto, non undefined
                    }
                ],
                changeAddress: userAddress,
                fee: feeNano,
                creationHeight: currentHeight
            };

            console.log("Richiesta firma per:", unsignedTx);

            // 4. Esecuzione
            const signedTx = await ergo.sign_tx(unsignedTx);
            const txId = await ergo.submit_tx(signedTx);
            
            console.log("✅ Pagamento inviato:", txId);
            return txId;

        } catch (e) {
            console.error("Errore firma:", e);
            // Se l'errore è 'startsWith', proviamo a spiegare all'utente cosa fare
            const msg = e.info || e.message || "";
            if (msg.includes("startsWith") || e.stack?.includes("startsWith")) {
                alert("Errore di validazione Nautilus. Prova a rinfrescare la pagina (F5) o a risincronizzare il wallet nelle impostazioni di Nautilus.");
            } else if (e.code !== 2) {
                alert("Errore: " + msg);
            }
            return null;
        }
    }
};
