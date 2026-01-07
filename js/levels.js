async function generateRandomGame() {
    try {
        const response = await fetch('./js/questions.json');
        if (!response.ok) throw new Error("File JSON non trovato");
        const pool = await response.json();
        
        const pick = (arr, n) => {
            let shuffled = [...arr].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, n);
        };

        let selected = [
            ...pick(pool.easy, 3),
            ...pick(pool.medium, 4),
            ...pick(pool.hard, 3)
        ];

        return selected.map((q, i) => ({ ...q, id: i + 1 }));
    } catch (e) {
        console.error("Errore caricamento livelli:", e);
        return null;
    }
}