import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

@customElement('ambient-clock')
export class AmbientClock extends LitElement {
  @state() private now = new Date();
  private timer?: number;

  static override styles = css`
    :host {
      display: block;
      background: radial-gradient(circle at top, #0f172a 0%, #020617 70%);
      color: #e2e8f0;
      border-radius: 20px;
      padding: 24px 28px;
      max-width: 320px;
      font-family: 'Inter', system-ui, sans-serif;
      border: 1px solid rgba(148, 163, 184, 0.3);
    }

    .time {
      font-size: 2.6rem;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    .zone {
      display: flex;
      justify-content: space-between;
      margin-top: 12px;
      font-size: 0.85rem;
      color: rgba(226, 232, 240, 0.7);
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.timer = window.setInterval(() => {
      this.now = new Date();
    }, 1000);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.clearInterval(this.timer);
  }

  protected override render() {
    return html`
      <div class="time" aria-live="polite">${this.formatTime(this.now)}</div>
      <div class="zone">
        <span>Local</span>
        <span>${this.formatZone(this.now)}</span>
      </div>
    `;
  }

  private formatTime(date: Date) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  private formatZone(date: Date) {
    return date.toLocaleTimeString(undefined, { timeZoneName: 'short' }).split(' ').pop() ?? '';
  }
}
