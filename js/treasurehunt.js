class TreasureHunt {
    constructor() {
        this.levels = [];
        this.currentIndex = 0;
    }

    getCurrentLevel() {
        return this.levels[this.currentIndex];
    }

    checkAnswer(input) {
        if (!input) return { success: false };
        const current = this.getCurrentLevel();
        if (input.trim().toLowerCase() === current.answer.toLowerCase()) {
            this.currentIndex++;
            return { success: true, finished: this.currentIndex >= this.levels.length };
        }
        return { success: false };
    }
}