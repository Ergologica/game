const CONFIG = {
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

            const userAddress = await ergo.get_change_address();
            const rawUtxos = await ergo.get_utxos(totalNeeded);
            const currentHeight = await ergo.get_current_height();

            if (!rawUtxos) throw new Error("Nessun UTXO trovato");

            // --- PULIZIA MANUALE DEGLI INPUT ---
            // Questo risolve il crash 'startsWith' se gli UTXO hanno asset complessi
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

            const unsignedTx = {
                inputs: cleanInputs,
                dataInputs: [],
                outputs: [
                    {
                        address: CONFIG.TREASURY_ADDRESS.trim(),
                        value: amountNano,
                        assets: [],
                        additionalRegisters: {}
                    }
                ],
                changeAddress: userAddress.toString(),
                fee: feeNano,
                creationHeight: parseInt(currentHeight)
            };

            console.log("Invio transazione pulita manualmente...");
            const signedTx = await ergo.sign_tx(unsignedTx);
            return await ergo.submit_tx(signedTx);

        } catch (e) {
            console.error("Errore critico:", e);
            if (e.code !== 2) {
                alert("Errore tecnico: " + (e.info || e.message));
            }
            return null;
        }
    }
};
