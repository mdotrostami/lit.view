import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

@customElement('temperature-card')
export class TemperatureCard extends LitElement {
  @state() private temperature = 72;

  static override styles = css`
    :host {
      display: block;
      border-radius: 20px;
      padding: 22px;
      max-width: 360px;
      background: linear-gradient(160deg, #050816, #111827 70%);
      color: #e2e8f0;
      font-family: 'Inter', system-ui, sans-serif;
      border: 1px solid rgba(148, 163, 184, 0.3);
    }

    .heading {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 12px;
    }

    .reading {
      font-size: 3rem;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    .status {
      font-size: 0.85rem;
      color: rgba(226, 232, 240, 0.7);
    }

    .gauge {
      width: 100%;
      height: 14px;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.2);
      overflow: hidden;
      margin: 18px 0;
    }

    .gauge span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background-image: linear-gradient(90deg, #38bdf8, #f472b6);
      transition: width 240ms ease;
    }

    input[type='range'] {
      width: 100%;
      accent-color: #22d3ee;
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
      <div class="gauge" aria-hidden="true">
        <span style=${`width:${ratio}%;`}></span>
      </div>
      <input
        type="range"
        min="40"
        max="110"
        .value=${String(this.temperature)}
        @input=${(event: Event) => (this.temperature = Number((event.target as HTMLInputElement).value))}
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
