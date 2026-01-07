const CONFIG = {
    TREASURY_ADDRESS: "9fTSmYKqZXLsyLvqDUbSwjZ7bMJMig9coSpbRdQunEo68sWyn4t",
    ENTRY_FEE_ERG: 0.5
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
            // Conversione pulita in NanoErgs
            const amountNano = (CONFIG.ENTRY_FEE_ERG * 1e9).toString();
            
            // Usiamo il metodo più diretto e astratto possibile.
            // Se Nautilus non mostra i dettagli con sign_tx, questo metodo
            // obbliga l'estensione a costruire lei la grafica della transazione.
            const txId = await ergo.pay_to_address(CONFIG.TREASURY_ADDRESS, amountNano);
            
            console.log("TX Sottomessa:", txId);
            return txId;
        } catch (e) {
            console.error("Errore firma:", e);
            // Se pay_to_address fallisce perché la versione è vecchia, 
            // mostriamo l'errore tecnico per capire cosa manca
            alert("Nautilus Error: " + (e.info || e.message || "Verifica i fondi"));
            return null;
        }
    }
};
