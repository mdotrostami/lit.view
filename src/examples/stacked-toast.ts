import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

@customElement('stacked-toast')
export class StackedToast extends LitElement {
  @state() private queue: string[] = [];

  static override styles = css`
    :host {
      display: block;
      position: relative;
      max-width: 360px;
      font-family: 'Inter', system-ui, sans-serif;
    }

    button {
      border: none;
      border-radius: 12px;
      padding: 10px 16px;
      font-weight: 600;
      background: #22d3ee;
      color: #020617;
      cursor: pointer;
      margin-bottom: 12px;
    }

    .toasts {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .toast {
      border-radius: 12px;
      padding: 12px 16px;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(148, 163, 184, 0.4);
      box-shadow: 0 12px 24px rgba(2, 6, 23, 0.4);
      color: #e2e8f0;
      animation: slide 240ms ease;
    }

    @keyframes slide {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;

  protected override render() {
    return html`
      <button type="button" @click=${this.enqueue}>Notify me</button>
      <div class="toasts" aria-live="polite">
        ${this.queue.map((text) => html`<div class="toast">${text}</div>`)}
      </div>
    `;
  }

  private enqueue() {
    const message = `Plan updated at ${new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
    this.queue = [message, ...this.queue].slice(0, 4);
    window.setTimeout(() => {
      this.queue = this.queue.slice(0, -1);
    }, 3000);
  }
}
