const CONFIG = {
    TREASURY_ADDRESS: "9fTSmYKqZXLsyLvqDUbSwjZ7bMJMig9coSpbRdQunEo68sWyn4t",
    MIN_BET: 0.1
};

const TransactionManager = {
    _pending: false,

    async connect() {
        if (typeof ergoConnector === 'undefined' || !ergoConnector.nautilus) {
            alert("Per favore installa Nautilus Wallet");
            return false;
        }
        return await ergoConnector.nautilus.connect();
    },

    async payEntryFee(userBet) {
        if (this._pending) return null;
        this._pending = true;

        try {
            const connected = await this.connect();
            if (!connected) throw new Error("Wallet non connesso");

            // Convertiamo la puntata in NanoErgs (1 ERG = 10^9 NanoErg)
            // Usiamo BigInt per evitare errori di arrotondamento JS
            const betNano = (BigInt(Math.floor(userBet * 1000)) * BigInt(1000000)).toString();
            const feeNano = "1100000"; // 0.0011 ERG standard fee
            const totalRequired = (BigInt(betNano) + BigInt(feeNano)).toString();

            const rawUtxos = await ergo.get_utxos(totalRequired);
            if (!rawUtxos || rawUtxos.length === 0) {
                throw new Error("Saldo insufficiente per la puntata e le commissioni.");
            }

            const changeAddress = await ergo.get_change_address();
            const creationHeight = await ergo.get_current_height();

            // Costruzione ultra-pulita per evitare il bug 'startsWith'
            const unsignedTx = {
                inputs: rawUtxos.map(u => ({
                    boxId: u.boxId,
                    value: u.value.toString(),
                    ergoTree: u.ergoTree,
                    assets: u.assets || [],
                    additionalRegisters: u.additionalRegisters || {},
                    creationHeight: u.creationHeight,
                    transactionId: u.transactionId,
                    index: u.index
                })),
                dataInputs: [],
                outputs: [{
                    address: CONFIG.TREASURY_ADDRESS.trim(),
                    value: betNano,
                    assets: []
                }],
                changeAddress: Array.isArray(changeAddress) ? changeAddress[0] : changeAddress,
                fee: feeNano,
                creationHeight: parseInt(creationHeight)
            };

            const signedTx = await ergo.sign_tx(unsignedTx);
            return await ergo.submit_tx(signedTx);

        } catch (error) {
            console.error("Errore:", error);
            alert("Errore Wallet: " + (error.info || error.message));
            return null;
        } finally {
            this._pending = false;
        }
    }
};
