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
      max-width: 420px;
      padding: 26px 28px;
      border-radius: 22px;

      /* Ambient unified style */
      background:
        radial-gradient(circle at top left, rgba(238, 238, 238, 0.06) 0%, transparent 60%),
        radial-gradient(circle at bottom right, rgba(17, 43, 0, 0.25) 0%, transparent 70%),
        rgba(12, 20, 32, 0.68);

      border: 2px solid rgba(148, 163, 184, 0.28);

      backdrop-filter: blur(22px) saturate(160%);
      -webkit-backdrop-filter: blur(22px) saturate(160%);

      box-shadow:
        0 12px 34px rgba(0, 0, 0, 0.45),
        inset 0 0 22px rgba(255, 255, 255, 0.04);

      font-family: 'Inter', system-ui, sans-serif;
      color: rgba(226, 232, 240, 0.95);
    }

    header {
      font-size: 1.05rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 20px;
      font-weight: 600;
      color: rgba(148, 163, 184, 0.85);
      text-shadow: 0 0 10px rgba(255,255,255,0.04);
    }

    .metric {
      margin-bottom: 20px;
    }

    .label {
      display: flex;
      justify-content: space-between;
      font-size: 0.88rem;
      color: rgba(226, 232, 240, 0.85);
    }

    .bar {
      height: 12px;
      border-radius: 999px;
      margin-top: 8px;
      overflow: hidden;

      background: rgba(148, 163, 184, 0.18);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);

      border: 1px solid rgba(255,255,255,0.08);
    }

    .bar span {
      height: 100%;
      display: block;
      border-radius: inherit;

      /* Glassy gradient progress */
      background: linear-gradient(
        90deg,
        rgba(192, 132, 252, 0.9),
        rgba(56, 189, 248, 0.95)
      );

      box-shadow:
        0 0 12px rgba(192, 132, 252, 0.5),
        0 0 18px rgba(56, 189, 248, 0.4);

      transition: width 260ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    button {
      width: 100%;
      margin-top: 10px;

      border: none;
      border-radius: 12px;
      padding: 10px 0;

      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;

      /* Ambient glass-blue button */
      background: linear-gradient(
        135deg,
        rgba(96, 165, 250, 0.85),
        rgba(129, 140, 248, 0.9)
      );

      color: white;

      box-shadow: 0 16px 28px rgba(59,130,246,0.28);
      transition: 150ms ease;
    }

    button:hover {
      filter: brightness(1.06);
      box-shadow: 0 20px 32px rgba(59,130,246,0.38);
    }

    button:active {
      transform: translateY(1px);
      box-shadow: 0 12px 22px rgba(59,130,246,0.28);
    }
  `;

  protected override render() {
    return html`
      <header>Focus dashboard</header>

      ${this.metrics.map(
        (metric) => html`
          <div class="metric">
            <div class="label">
              <span>${metric.label}</span>
              <span>${metric.value}/${metric.goal}</span>
            </div>

            <div class="bar">
              <span
                style=${`width:${Math.min(
                  (metric.value / metric.goal) * 100,
                  100
                )}%;`}
              ></span>
            </div>
          </div>
        `
      )}

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
