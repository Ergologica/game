const CONFIG = {
    // Il tuo indirizzo Mainnet confermato
    TREASURY_ADDRESS: "9fTSmYKqZXLsyLvqDUbSwjZ7bMJMig9coSpbRdQunEo68sWyn4t",
    ENTRY_FEE_ERG: 0.5
};

const TransactionManager = {
    /**
     * Connette il sito al wallet Nautilus
     */
    async connect() {
        if (typeof ergoConnector !== 'undefined' && ergoConnector.nautilus) {
            const connected = await ergoConnector.nautilus.connect();
            if (connected) {
                console.log("Wallet connesso con successo");
                return true;
            }
            return false;
        }
        alert("Nautilus Wallet non trovato! Per favore installalo.");
        return false;
    },

    /**
     * Recupera l'indirizzo principale dell'utente
     */
    async getAddress() {
        try {
            return await ergo.get_change_address();
        } catch (e) {
            console.error("Errore recupero indirizzo:", e);
            return null;
        }
    },

    /**
     * Gestisce il pagamento di 0.5 ERG. 
     * Utilizza il metodo pay_to_address per la massima compatibilità.
     */
    async payEntryFee() {
        try {
            // Conversione in NanoErgs (0.5 ERG = 500,000,000 NanoErgs)
            const nanoErgs = (CONFIG.ENTRY_FEE_ERG * 1000000000).toString();
            
            console.log(`Richiesta di pagamento di ${CONFIG.ENTRY_FEE_ERG} ERG a ${CONFIG.TREASURY_ADDRESS}`);

            // Questo comando apre la finestra di Nautilus e gestisce UTXOs e Fees internamente
            const txId = await ergo.pay_to_address(CONFIG.TREASURY_ADDRESS, nanoErgs);
            
            if (txId) {
                console.log("Transazione sottomessa! ID:", txId);
                return txId;
            }
            return null;
        } catch (e) {
    // Sostituisci l'alert generico con questo per un test:
    alert("ERRORE REALE: " + JSON.stringify(e)); 
    console.error(e);
    return null;
}
    }
    }
};
