import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

@customElement('ambient-clock')
export class AmbientClock extends LitElement {
  @state() private now = new Date();
  private timer?: number;

  static override styles = css`
    :host {
      display: block;

      background:
        radial-gradient(circle at top left, rgba(238, 238, 238, 0.06) 0%, transparent 60%),
        radial-gradient(circle at bottom right, rgba(17, 43, 0, 0.25) 0%, transparent 70%),
        rgba(12, 20, 32, 0.7);

      color: rgba(226, 232, 240, 0.95);
      border-radius: 20px;
      padding: 28px 30px;
      margin: auto;
      max-width: 340px;
      font-family: 'Inter', system-ui, sans-serif;

      border: 2px solid rgba(148, 163, 184, 0.28);
      backdrop-filter: blur(18px) saturate(160%);
      -webkit-backdrop-filter: blur(18px) saturate(160%);

      box-shadow:
        0 12px 30px rgba(0,0,0,0.45),
        inset 0 0 22px rgba(255,255,255,0.03);
    }

    .time {
      font-size: 2.7rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-shadow: 0 0 12px rgba(255, 255, 255, 0.06);
    }

    .zone {
      display: flex;
      justify-content: space-between;
      margin-top: 14px;
      font-size: 0.9rem;
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
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  private formatZone(date: Date) {
    return date
      .toLocaleTimeString(undefined, { timeZoneName: 'short' })
      .split(' ')
      .pop() ?? '';
  }
}
