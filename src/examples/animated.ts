import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('glossy-glass-card')
export class GlossyGlassCard extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    .background {
      position: absolute;
      inset: 0;
      overflow: hidden;
      background-color: transparent;
      z-index: 0;
      border-radius: 24px;
    }

    .background-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      filter: brightness(0.55) blur(4px);
      transform: scale(1.05);
    }

    .card {
      position: relative;
      z-index: 1;
      margin: 48px auto;
      max-width: 420px;

      /* همان استایل امبینت هماهنگ با clock / toast / login-form */
      background:
        radial-gradient(circle at top left, rgba(238, 238, 238, 0.06) 0%, transparent 60%),
        radial-gradient(circle at bottom right, rgba(17, 43, 0, 0.25) 0%, transparent 70%),
        rgba(12, 20, 32, 0.65);

      border: 2px solid rgba(148, 163, 184, 0.28);
      border-radius: 22px;

      backdrop-filter: blur(22px) saturate(160%);
      -webkit-backdrop-filter: blur(22px) saturate(160%);

      padding: 26px 28px;

      box-shadow:
        0 12px 32px rgba(0, 0, 0, 0.45),
        inset 0 0 24px rgba(255, 255, 255, 0.04);

      color: rgba(226, 232, 240, 0.95);
      font-family: 'Inter', system-ui, sans-serif;

      transition: 220ms ease-out;
    }

    .card:hover {
      transform: translateY(-4px);
      box-shadow:
        0 22px 48px rgba(0, 0, 0, 0.5),
        inset 0 0 28px rgba(255, 255, 255, 0.05);
    }

    .shine {
      position: absolute;
      inset: 0;
      pointer-events: none;
      border-radius: inherit;

      background: radial-gradient(
        circle at top left,
        rgba(255, 255, 255, 0.22),
        transparent 60%
      );

      opacity: 0.6;
    }

    .title {
      font-size: 1.35rem;
      font-weight: 600;
      margin-bottom: 6px;
      letter-spacing: 0.02em;
      text-shadow: 0 0 12px rgba(255,255,255,0.08);
    }

    .subtitle {
      opacity: 0.75;
      margin-bottom: 14px;
      font-size: 0.9rem;
    }

    ::slotted(*) {
      margin-top: 10px;
    }
  `;

  @property({ type: String }) image = 'back.jpg';
  @property({ type: String }) label = 'Glass Card';
  @property({ type: String }) subtitle = 'A glossy ambient UI component';

  render() {
    return html`
      <div class="background">
        <img class="background-image" src=${this.image} alt="" role="presentation" />
      </div>

      <div class="card">
        <div class="shine"></div>

        <div class="title">${this.label}</div>
        <div class="subtitle">${this.subtitle}</div>

        <slot></slot>
      </div>
    `;
  }
}
