import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

@customElement('temperature-card')
export class TemperatureCard extends LitElement {
  @state() private temperature = 72;

  static override styles = css`
    :host {
      display: block;
      max-width: 360px;
      margin: auto;
      padding: 26px 28px;
      border-radius: 22px;

      /* Ambient unified background */
      background:
        radial-gradient(circle at top left, rgba(238, 238, 238, 0.06) 0%, transparent 60%),
        radial-gradient(circle at bottom right, rgba(17, 43, 0, 0.25) 0%, transparent 70%),
        rgba(12, 20, 32, 0.7);

      border: 2px solid rgba(148, 163, 184, 0.28);

      backdrop-filter: blur(22px) saturate(160%);
      -webkit-backdrop-filter: blur(22px) saturate(160%);

      box-shadow:
        0 12px 34px rgba(0, 0, 0, 0.45),
        inset 0 0 22px rgba(255, 255, 255, 0.04);

      font-family: 'Inter', system-ui, sans-serif;
      color: rgba(226,232,240,0.95);
    }

    .heading {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 14px;
    }

    .reading {
      font-size: 3rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-shadow: 0 0 12px rgba(255,255,255,0.05);
    }

    .status {
      font-size: 0.9rem;
      color: rgba(226,232,240,0.75);
    }

    .gauge {
      width: 100%;
      height: 14px;
      border-radius: 999px;
      margin: 20px 0 18px;

      background: rgba(148,163,184,0.18);
      border: 1px solid rgba(255,255,255,0.08);

      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);

      overflow: hidden;
    }

    .gauge span {
      display: block;
      height: 100%;
      border-radius: inherit;

      /* Ambient glow gradient */
      background: linear-gradient(90deg,
        rgba(56, 189, 248, 0.95),
        rgba(244, 114, 182, 0.95)
      );

      box-shadow:
        0 0 12px rgba(56,189,248,0.4),
        0 0 18px rgba(244,114,182,0.35);

      transition: width 260ms cubic-bezier(0.16,1,0.3,1);
    }

    input[type='range'] {
      width: 100%;
      accent-color: rgba(96,165,250,0.9);

      /* more ambient slider */
      filter: drop-shadow(0 4px 12px rgba(96,165,250,0.35));
    }
  `;

  protected override render() {
    const normalized = Math.min(Math.max(this.temperature, 40), 110);
    const ratio = ((normalized - 40) / 70) * 100;

    return html`
      <div class="heading">
        <div>
          <div class="status">Ambient temperature</div>
          <div class="reading">${this.temperature}°F</div>
        </div>
        <div class="status">${this.indicator(this.temperature)}</div>
      </div>

      <div class="gauge">
        <span style=${`width:${ratio}%;`}></span>
      </div>

      <input
        type="range"
        min="40"
        max="110"
        .value=${String(this.temperature)}
        @input=${(event: Event) =>
          (this.temperature = Number((event.target as HTMLInputElement).value))}
      />
    `;
  }

  private indicator(temp: number) {
    if (temp < 60) return 'Cooling';
    if (temp < 75) return 'Balanced';
    if (temp < 90) return 'Warm';
    return 'Hot';
  }
}
