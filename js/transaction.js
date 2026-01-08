const CONFIG = {
    TREASURY_ADDRESS: "9fTSmYKqZXLsyLvqDUbSwjZ7bMJMig9coSpbRdQunEo68sWyn4t",
    MIN_BET: 0.1
};

const TransactionManager = {
    _pending: false,

    async connect() {
        if (typeof ergoConnector === 'undefined' || !ergoConnector.nautilus) {
            alert("Nautilus Wallet non trovato. Assicurati che l'estensione sia installata.");
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

            // 1. Validazione input e conversione sicura
            const safeBet = parseFloat(userBet) || CONFIG.MIN_BET;
            const betNano = (BigInt(Math.floor(safeBet * 1000)) * BigInt(1000000)).toString();
            const feeNano = "1100000"; 
            const totalRequired = (BigInt(betNano) + BigInt(feeNano)).toString();

            // 2. Recupero dati con attesa forzata (evita il bug asincrono)
            const utxos = await ergo.get_utxos(totalRequired);
            const changeAddr = await ergo.get_change_address();
            const height = await ergo.get_current_height();

            if (!utxos || utxos.length === 0) throw new Error("Fondi insufficienti");

            // 3. COSTRUZIONE "NARROW": Passiamo solo stringhe e numeri certi
            // Questo formato previene il crash 'startsWith' di Nautilus
            const unsignedTx = {
                inputs: utxos,
                dataInputs: [],
                outputs: [{
                    address: String(CONFIG.TREASURY_ADDRESS).trim(),
                    value: String(betNano),
                    assets: []
                }],
                // IMPORTANTE: Se changeAddr è un array, prendiamo il primo elemento
                changeAddress: Array.isArray(changeAddr) ? String(changeAddr[0]) : String(changeAddr),
                fee: String(feeNano),
                creationHeight: parseInt(height)
            };

            console.log("TX inviata per la firma:", unsignedTx);

            // 4. Esecuzione firma
            const signedTx = await ergo.sign_tx(unsignedTx);
            const txId = await ergo.submit_tx(signedTx);

            return txId;

        } catch (error) {
            console.error("Errore critico:", error);
            const errorMsg = error.info || error.message || "";
            
            // Gestione specifica dell'errore asincrono di Nautilus
            if (errorMsg.includes("startsWith") || errorMsg.includes("undefined")) {
                alert("Nautilus ha avuto un sussulto tecnico. \n\nPer risolvere: \n1. Chiudi e riapri il browser \n2. Sblocca Nautilus prima di cliccare");
            } else if (error.code !== 2) {
                alert("Errore: " + errorMsg);
            }
            return null;
        } finally {
            this._pending = false;
        }
    },

    async getAddress() {
        try {
            const addr = await ergo.get_change_address();
            return Array.isArray(addr) ? addr[0] : addr;
        } catch (e) { return ""; }
    }
};
