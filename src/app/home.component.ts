import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DeckbuildingService } from './core/services/deckbuilding.service';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <main class="shell">
      <section class="status">
        <h1>Congero</h1>
        <dl>
          <div>
            <dt>Card pool</dt>
            <dd>{{ cardPoolCount() }}</dd>
          </div>
          <div>
            <dt>Starting deck</dt>
            <dd>{{ startingDeckCount() }}</dd>
          </div>
        </dl>
        <nav aria-label="Screens">
          <a href="/gameplay">Gameplay</a>
          <a href="/deck">Deck</a>
          <a href="/shop">Shop</a>
          <a href="/score">Score</a>
        </nav>
      </section>
    </main>
  `,
  styles: [
    `
      .shell {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 32px;
        box-sizing: border-box;
      }

      .status {
        width: min(520px, 100%);
      }

      h1 {
        margin: 0 0 24px;
        font-size: 40px;
        line-height: 1.1;
        letter-spacing: 0;
      }

      dl {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin: 0;
      }

      div {
        border: var(--congero-panel-borderWidth) solid var(--congero-color-voidGray);
        border-radius: 8px;
        padding: 16px;
        background: var(--congero-color-nebulaDark);
      }

      dt {
        color: var(--congero-color-cometGray);
        font-size: 14px;
      }

      dd {
        margin: 8px 0 0;
        font-size: 28px;
      }

      nav {
        display: flex;
        flex-wrap: wrap;
        gap: var(--congero-spacing-md);
        margin-top: var(--congero-spacing-xl);
      }

      a {
        color: var(--congero-color-neonCyan);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly deckbuilding = inject(DeckbuildingService);
  private readonly cardPool = this.deckbuilding.cardPool;

  protected readonly cardPoolCount = computed(() => this.cardPool().length);
  protected readonly startingDeckCount = computed(() =>
    this.deckbuilding.getStartingDeckCount(this.cardPool()),
  );
}
