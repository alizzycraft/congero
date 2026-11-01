import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="not-found">
      <h1>Screen Not Found</h1>
      <a routerLink="/">Return home</a>
    </main>
  `,
  styles: [
    `
      .not-found {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 32px;
      }

      h1 {
        margin: 0 0 16px;
        font-size: 32px;
      }

      a {
        color: var(--congero-color-neonCyan);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {}
