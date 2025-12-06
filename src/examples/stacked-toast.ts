import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

@customElement('stacked-toast')
export class StackedToast extends LitElement {
  @state() private queue: string[] = [];

  static override styles = css`
    :host {
      display: block;
      position: relative;
      margin: auto;
      max-width: 360px;
      font-family: 'Inter', system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    button {
      border: none;
      border-radius: 14px;
      padding: 10px 18px;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      color: #111;
      cursor: pointer;
      margin-bottom: 16px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
      transition: all 0.2s ease;
    }

    button:hover {
      background: rgba(255,255,255,0.9);
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    }

    .toasts {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .toast {
      border-radius: 18px;
      padding: 14px 18px;

      /* Apple-style glassmorphism */
      background: rgba(255, 255, 255, 0.25);
      backdrop-filter: blur(18px) saturate(180%);
      -webkit-backdrop-filter: blur(18px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.35);

      box-shadow:
        0 4px 12px rgba(0,0,0,0.08),
        0 8px 24px rgba(0,0,0,0.12);

      color: rgba(0, 0, 0, 0.85);
      font-weight: 500;

      animation: slide 260ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slide {
      from {
        opacity: 0;
        transform: translateY(12px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
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
