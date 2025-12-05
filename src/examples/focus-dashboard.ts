import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

type Metric = { label: string; value: number; goal: number };

@customElement('focus-dashboard')
export class FocusDashboard extends LitElement {
  @state() private metrics: Metric[] = [
    { label: 'Deep work', value: 4.5, goal: 8 },
    { label: 'Meetings', value: 1.5, goal: 3 },
    { label: 'Breaks', value: 2, goal: 2 },
    { label: 'Ideas captured', value: 12, goal: 15 }
  ];

  static override styles = css`
    :host {
      display: block;
      border-radius: 20px;
      padding: 22px;
      background: #020617;
      border: 1px solid rgba(148, 163, 184, 0.3);
      font-family: 'Inter', system-ui, sans-serif;
      color: #e2e8f0;
      max-width: 420px;
    }

    header {
      font-size: 1.1rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 14px;
      color: #94a3b8;
    }

    .metric {
      margin-bottom: 16px;
    }

    .label {
      display: flex;
      justify-content: space-between;
      font-size: 0.9rem;
      color: rgba(226, 232, 240, 0.8);
    }

    .bar {
      height: 10px;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.2);
      overflow: hidden;
      margin-top: 6px;
    }

    .bar span {
      height: 100%;
      display: block;
      border-radius: inherit;
      background: linear-gradient(90deg, #c084fc, #38bdf8);
      transition: width 240ms ease;
    }

    button {
      border: none;
      border-radius: 12px;
      padding: 8px 14px;
      background: #22d3ee;
      color: #020617;
      font-weight: 600;
      cursor: pointer;
    }
  `;

  protected override render() {
    return html`
      <header>Focus dashboard</header>
      ${this.metrics.map((metric) => html`
        <div class="metric">
          <div class="label">
            <span>${metric.label}</span>
            <span>${metric.value}/${metric.goal}</span>
          </div>
          <div class="bar">
            <span style=${`width:${Math.min((metric.value / metric.goal) * 100, 100)}%;`}></span>
          </div>
        </div>
      `)}
      <button type="button" @click=${this.bumpMetrics}>Boost streak</button>
    `;
  }

  private bumpMetrics() {
    this.metrics = this.metrics.map((metric) => {
      const increment = Math.random() * 0.5;
      return {
        ...metric,
        value: Math.min(metric.goal, metric.value + increment)
      };
    });
  }
}
