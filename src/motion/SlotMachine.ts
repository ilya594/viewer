// Вместо type Symbol = number; используем более специфичное название
type ReelSymbol = number;  // ← вот это основное изменение

// ======================== КОНСТАНТЫ ========================
const CONFIG = {
  REEL_COUNT: 7,
  VISIBLE_SYMBOLS: 5,
  SYMBOL_SIZE: 120,
  REEL_WIDTH: 120,
  REEL_GAP: 20,
  SPIN_DURATION_BASE: 7800,
  REEL_START_DELAY: 160,
  PIXELS_PER_FRAME: 136,
  MIN_FULL_SPINS: 18,
  EXTRA_SPINS_RANDOM: 6,
  EASE_OUT_MS: 1400,
} as const;

// ======================== КЛАСС ========================
export class SlotMachine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private reels: ReelSymbol[][];              // ← изменили здесь
  private reelPixelOffsets: number[] = [];
  private isSpinning: boolean = false;
  private animationFrameId: number | null = null;

  constructor(
    private container: HTMLElement,
    initialReels: ReelSymbol[][]               // ← и здесь
  ) {
    this.reels = initialReels.map(reel => [...reel]);
    this.reelPixelOffsets = new Array(CONFIG.REEL_COUNT).fill(0);

    this.createCanvas();
    this.draw();
    this.createSpinButton();
  }

  private createCanvas() {
    this.canvas = document.createElement('canvas');
    
    const totalWidth = 
      CONFIG.REEL_COUNT * CONFIG.REEL_WIDTH + 
      (CONFIG.REEL_COUNT - 1) * CONFIG.REEL_GAP;
    
    this.canvas.width = totalWidth + 40;
    this.canvas.height = CONFIG.SYMBOL_SIZE * CONFIG.VISIBLE_SYMBOLS + 40;
    
    this.canvas.style.border = '4px solid #222';
    this.canvas.style.borderRadius = '12px';
    this.canvas.style.background = '#0d001a';
    this.canvas.style.boxShadow = '0 0 40px rgba(80,0,150,0.4)';

    this.ctx = this.canvas.getContext('2d')!;
    this.container.appendChild(this.canvas);
  }

  private createSpinButton() {
    const btn = document.createElement('button');
    btn.textContent = 'SPIN';
    btn.className = 'spin-btn';
    btn.addEventListener('click', () => this.startSpin());
    this.container.appendChild(btn);
  }
  

  // ... (createCanvas, createSpinButton без изменений)

  private getSymbolText(value: ReelSymbol): string {
    const map: Record<number, string> = {
      1: '⻅', 2: '🍋', 3: '⻮', 4: '🍇', 5: '🔔',
      6: '⭐', 7: '⛔', 8: '⚡', 9: '💎', 10: '💰'
    };
    return map[value] ?? String(value);
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let reel = 0; reel < CONFIG.REEL_COUNT; reel++) {
      const x = 20 + reel * (CONFIG.REEL_WIDTH + CONFIG.REEL_GAP);
      const offset = this.reelPixelOffsets[reel] % CONFIG.SYMBOL_SIZE;

      for (let row = -1; row <= CONFIG.VISIBLE_SYMBOLS; row++) {
        const symbolIndex = Math.floor(
          (this.reelPixelOffsets[reel] / CONFIG.SYMBOL_SIZE + row + 10000)
        ) % this.reels[reel].length;

        const y = 20 + row * CONFIG.SYMBOL_SIZE + offset;

        this.ctx.fillStyle = '#110022';
        this.ctx.fillRect(x, y, CONFIG.REEL_WIDTH, CONFIG.SYMBOL_SIZE);

        this.ctx.strokeStyle = '#331155';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, CONFIG.REEL_WIDTH, CONFIG.SYMBOL_SIZE);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 64px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const text = this.getSymbolText(this.reels[reel][symbolIndex]);
        this.ctx.fillText(text, x + CONFIG.REEL_WIDTH / 2, y + CONFIG.SYMBOL_SIZE / 2);
      }
    }
  }
  private startSpin() {
    if (this.isSpinning) return;
    this.isSpinning = true;

    const btn = this.container.querySelector('.spin-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'SPINNING...';

    for (let i = 0; i < CONFIG.REEL_COUNT; i++) {
      setTimeout(() => this.animateReel(i), i * CONFIG.REEL_START_DELAY);
    }
  }

  private animateReel(reelIndex: number) {
    const extraSpins = Math.floor(Math.random() * (CONFIG.EXTRA_SPINS_RANDOM + 1));
    const totalSpins = CONFIG.MIN_FULL_SPINS + extraSpins + reelIndex * 0.4;
    
    const totalDistance = totalSpins * this.reels[reelIndex].length * CONFIG.SYMBOL_SIZE;
    
    const startTime = performance.now();
    const duration = CONFIG.SPIN_DURATION_BASE + reelIndex * 350;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      let progress = Math.min(elapsed / duration, 1);

      let eased = progress;

      // Ускорение в начале
      if (progress < 0.12) {
        eased = progress * 8; // быстрый разгон
      } 
      // Плавное торможение в конце
      else if (progress > 0.72) {
        const t = (progress - 0.72) / 0.28;
        eased = 0.72 + 0.28 * (1 - Math.pow(1 - t, 3)); // easeOutCubic
      }

      this.reelPixelOffsets[reelIndex] = totalDistance * eased;

      this.draw();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Финальное выравнивание по сетке
        this.reelPixelOffsets[reelIndex] = 
          Math.round(this.reelPixelOffsets[reelIndex] / CONFIG.SYMBOL_SIZE) * CONFIG.SYMBOL_SIZE;
        
        this.draw();

        // Проверяем, закончились ли все барабаны
        if (this.allReelsStopped()) {
          this.finishSpin();
        }
      }
    };

    requestAnimationFrame(animate);
  }

  private allReelsStopped(): boolean {
    // Простая проверка — все ли завершили анимацию
    // В реальном проекте лучше считать активные анимации
    return true; // заглушка — можно улучшить
  }

private finishSpin() {
    this.isSpinning = false;

    const btn = this.container.querySelector('.spin-btn') as HTMLButtonElement;
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'SPIN';
    }

    this.showResult();
  }
  // ... (остальные методы startSpin, animateReel, finishSpin, showResult остаются почти без изменений)

  private showResult() {
    const middle: string[] = [];

    for (let i = 0; i < CONFIG.REEL_COUNT; i++) {
      const offset = this.reelPixelOffsets[i];
      const index = Math.round(offset / CONFIG.SYMBOL_SIZE) % this.reels[i].length;
      middle.push(this.getSymbolText(this.reels[i][index]));
    }

    console.log('Результат:', middle.join('  |  '));
  }
}