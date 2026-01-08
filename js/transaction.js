const CONFIG = {
    TREASURY_ADDRESS: "9fTSmYKqZXLsyLvqDUbSwjZ7bMJMig9coSpbRdQunEo68sWyn4t",
    MIN_BET: 0.1
};

const TransactionManager = {
    _pending: false,

    async connect() {
        if (typeof ergoConnector === 'undefined' || !ergoConnector.nautilus) {
            alert("Nautilus non trovato!");
            return false;
        }
        return await ergoConnector.nautilus.connect();
    },

    async payEntryFee(userBet) {
        if (this._pending) return null;
        this._pending = true;

        try {
            // 1. Forza la riconnessione ogni volta per pulire la cache
            await ergoConnector.nautilus.connect();
            
            // PICCOLO RITARDO: Fondamentale per evitare che la finestra si chiuda subito
            await new Promise(r => setTimeout(r, 500));

            const amountNano = (BigInt(Math.floor(userBet * 1000)) * BigInt(1000000)).toString();

            // 2. Chiediamo i dati all'ultimo secondo utile
            const height = await ergo.get_current_height();
            const utxos = await ergo.get_utxos(amountNano);
            const change = await ergo.get_change_address();

            // 3. Costruzione dell'oggetto SENZA proprietà superflue
            // Nota: Riduciamo l'oggetto all'osso assoluto
            const tx = {
                inputs: utxos,
                outputs: [{
                    address: CONFIG.TREASURY_ADDRESS,
                    value: amountNano
                }],
                changeAddress: Array.isArray(change) ? change[0] : change,
                fee: "1100000",
                creationHeight: height
            };

            console.log("Richiesta firma finale...", tx);

            // 4. Firma
            const signedTx = await ergo.sign_tx(tx);
            
            if(!signedTx) throw new Error("Firma fallita o annullata");

            const txId = await ergo.submit_tx(signedTx);
            return txId;

        } catch (error) {
            console.error("Errore firma:", error);
            // Se la finestra sparisce, Nautilus restituisce spesso un errore vuoto o 'Internal Error'
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
