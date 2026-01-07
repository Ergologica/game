const CONFIG = {
    TREASURY_ADDRESS: "9fTSmYKqZXLsyLvqDUbSwjZ7bMJMig9coSpbRdQunEo68sWyn4t",
    ENTRY_FEE_ERG: 0.5
};

const TransactionManager = {
    // Forza la connessione e attende la risposta del wallet
    async connect() {
        if (typeof ergoConnector !== 'undefined' && ergoConnector.nautilus) {
            const isConnected = await ergoConnector.nautilus.connect();
            if (isConnected) {
                // Piccola attesa per permettere a Nautilus di iniettare l'oggetto 'ergo'
                await new Promise(resolve => setTimeout(resolve, 500));
                return true;
            }
        }
        alert("Nautilus non risponde. Assicurati che l'estensione sia sbloccata.");
        return false;
    },

    async payEntryFee() {
        try {
            // Verifichiamo se l'oggetto ergo esiste, altrimenti lo cerchiamo nell'estensione
            const context = (typeof ergo !== 'undefined') ? ergo : await ergoConnector.nautilus.getContext();
            
            const nanoErgs = (CONFIG.ENTRY_FEE_ERG * 1000000000).toString();
            
            // Usiamo il contesto diretto del wallet
            const txId = await context.pay_to_address(CONFIG.TREASURY_ADDRESS, nanoErgs);
            return txId;
        } catch (e) {
            console.error("Errore firma:", e);
            alert("Errore durante la firma: " + (e.info || e.message || "Riprova tra un istante"));
            return null;
        }
    }
};
