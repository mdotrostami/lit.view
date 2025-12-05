import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('pulse-tabs')
export class PulseTabs extends LitElement {
  @property({ type: Array }) tabs = ['Flow', 'Tasks', 'Stats'];
  @state() private activeIndex = 0;

  static override styles = css`
    :host {
      display: block;
      border-radius: 16px;
      padding: 18px;
      background: #020617;
      color: #f8fafc;
      max-width: 400px;
      font-family: 'Inter', system-ui, sans-serif;
      border: 1px solid rgba(148, 163, 184, 0.3);
    }

    nav {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
    }

    button {
      flex: 1;
      border-radius: 999px;
      border: 1px solid transparent;
      background: rgba(148, 163, 184, 0.15);
      color: inherit;
      padding: 8px 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 120ms ease, border 120ms ease;
    }

    button[aria-selected='true'] {
      background: #22d3ee;
      color: #020617;
      border-color: #22d3ee;
    }

    section {
      min-height: 100px;
      padding: 12px 10px;
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(148, 163, 184, 0.2);
    }

    .title {
      font-size: 1.1rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #94a3b8;
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
