import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('pulse-tabs')
export class PulseTabs extends LitElement {
  @property({ type: Array }) tabs = ['Flow', 'Tasks', 'Stats'];
  @state() private activeIndex = 0;

  static override styles = css`
    :host {
      display: block;
      max-width: 400px;
      padding: 26px 28px;
      border-radius: 22px;

      /* Ambient unified style */
      background:
        radial-gradient(circle at top left, rgba(238,238,238,0.06) 0%, transparent 60%),
        radial-gradient(circle at bottom right, rgba(17,43,0,0.25) 0%, transparent 70%),
        rgba(12,20,32,0.7);

      border: 2px solid rgba(148,163,184,0.28);

      backdrop-filter: blur(22px) saturate(160%);
      -webkit-backdrop-filter: blur(22px) saturate(160%);

      box-shadow:
        0 12px 34px rgba(0, 0, 0, 0.45),
        inset 0 0 22px rgba(255, 255, 255, 0.04);

      font-family: 'Inter', system-ui, sans-serif;
      color: rgba(226, 232, 240, 0.95);
    }

    nav {
      display: flex;
      gap: 12px;
      margin-bottom: 22px;
    }

    button {
      flex: 1;
      border-radius: 999px;
      border: 1px solid rgba(148,163,184,0.25);

      /* Ambient glass pill */
      background: rgba(255,255,255,0.06);
      padding: 10px 14px;
      color: rgba(226,232,240,0.85);

      font-weight: 600;
      cursor: pointer;
      transition: 180ms ease;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }

    button:hover {
      background: rgba(255,255,255,0.12);
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(0,0,0,0.25);
    }

    button[aria-selected='true'] {
      background: linear-gradient(
        135deg,
        rgba(96,165,250,0.85),
        rgba(129,140,248,0.9)
      );
      border-color: transparent;
      color: white;
      box-shadow: 0 10px 28px rgba(96,165,250,0.35);
    }

    section {
      min-height: 120px;
      padding: 18px 16px;
      border-radius: 18px;

      /* Ambient panel */
      background:
        radial-gradient(circle at top left, rgba(238,238,238,0.06) 0%, transparent 65%),
        rgba(12,20,32,0.55);

      border: 1px solid rgba(148,163,184,0.22);

      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);

      box-shadow:
        inset 0 0 14px rgba(255,255,255,0.03);
    }

    .title {
      font-size: 1rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(148,163,184,0.85);
      margin-bottom: 10px;
    }

    p {
      margin: 0;
      font-size: 0.9rem;
      color: rgba(226,232,240,0.88);
      line-height: 1.45;
    }
  `;

  protected override render() {
    return html`
      <nav role="tablist">
        ${this.tabs.map(
          (tab, index) => html`
            <button
              role="tab"
              @click=${() => this.select(index)}
              aria-selected=${this.activeIndex === index}
            >
              ${tab}
            </button>
          `
        )}
      </nav>

      <section role="tabpanel">
        <div class="title">${this.tabs[this.activeIndex]}</div>
        <p>${this.summaryFor(this.tabs[this.activeIndex])}</p>
      </section>
    `;
  }

  private select(index: number) {
    this.activeIndex = index;
  }

  private summaryFor(tab: string) {
    switch (tab) {
      case 'Flow':
        return 'A glance at your recurring processes keeps momentum steady.';
      case 'Tasks':
        return 'Pin the next critical tasks and watch dependencies move forward.';
      case 'Stats':
        return 'Monitor conversion points without context switching.';
      default:
        return 'Tap a tab to reveal its details.';
    }
  }
}
