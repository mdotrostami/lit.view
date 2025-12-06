import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export type LoginPayload = {
  email: string;
  password: string;
  remember: boolean;
};

@customElement('login-form')
export class LoginForm extends LitElement {
  @property({ type: String }) heading = 'Sign in';
  @property({ type: String }) emailLabel = 'Email';
  @property({ type: String }) passwordLabel = 'Password';
  @property({ type: String }) submitLabel = 'Continue';
  @property({ type: Boolean }) showRemember = true;

  @state() private email = '';
  @state() private password = '';
  @state() private remember = false;
  @state() private error: string | null = null;
  @state() private submitting = false;

  static styles = css`
    :host {
      display: block;
      font-family: 'Inter', system-ui, sans-serif;
      color: rgba(226,232,240,0.95);
    }

    .card {
      max-width: 380px;
      margin: 0 auto;
      padding: 26px 28px;
      border-radius: 22px;

      /* Unified Ambient + Glass background */
      background:
        radial-gradient(circle at top left, rgba(238,238,238,0.06) 0%, transparent 65%),
        radial-gradient(circle at bottom right, rgba(17,43,0,0.25) 0%, transparent 70%),
        rgba(12,20,32,0.7);

      border: 2px solid rgba(148,163,184,0.28);

      backdrop-filter: blur(22px) saturate(160%);
      -webkit-backdrop-filter: blur(22px) saturate(160%);

      box-shadow:
        0 12px 34px rgba(0,0,0,0.45),
        inset 0 0 22px rgba(255,255,255,0.04);
    }

    .heading {
      margin: 0 0 6px;
      font-size: 1.05rem;
      font-weight: 600;
      color: rgba(226,232,240,0.95);
      text-shadow: 0 0 12px rgba(255,255,255,0.05);
    }

    .subtitle {
      margin: 0 0 18px;
      font-size: 0.82rem;
      color: rgba(148,163,184,0.75);
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    label {
      font-size: 0.82rem;
      color: rgba(148,163,184,0.92);
    }

    input[type="email"],
    input[type="password"] {
      border-radius: 10px;
      border: 1px solid rgba(148,163,184,0.35);
      padding: 10px 12px;

      background: rgba(15,23,42,0.55);
      color: rgba(226,232,240,0.95);

      font-size: 0.9rem;
      outline: none;

      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);

      transition: 160ms ease;
    }

    input::placeholder {
      color: rgba(148,163,184,0.55);
    }

    input:focus {
      border-color: rgba(96,165,250,0.85);
      box-shadow: 0 0 0 3px rgba(96,165,250,0.25);
      background: rgba(15,23,42,0.75);
    }

    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 6px;
    }

    .remember {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.82rem;
      color: rgba(148,163,184,0.92);
      cursor: pointer;
      user-select: none;
    }

    .remember input {
      width: 15px;
      height: 15px;
      accent-color: rgba(96,165,250,0.9);
    }

    .forgot {
      font-size: 0.82rem;
      color: rgba(129,140,248,0.92);
      text-decoration: none;
      cursor: pointer;
    }

    .forgot:hover {
      text-decoration: underline;
    }

    button {
      margin-top: 6px;
      padding: 12px 0;
      border-radius: 12px;
      border: none;

      font-size: 0.92rem;
      font-weight: 600;
      cursor: pointer;

      background: linear-gradient(
        135deg,
        rgba(96,165,250,0.85),
        rgba(129,140,248,0.9)
      );

      color: white;

      box-shadow: 0 16px 28px rgba(96,165,250,0.28);

      transition: 140ms ease;
    }

    button:hover {
      filter: brightness(1.06);
      box-shadow: 0 20px 34px rgba(96,165,250,0.38);
    }

    button:active {
      transform: translateY(1px);
      box-shadow: 0 12px 22px rgba(96,165,250,0.28);
    }

    button[disabled] {
      opacity: 0.6;
      cursor: default;
      box-shadow: none;
      filter: none;
    }

    .error {
      margin-top: 8px;
      font-size: 0.82rem;
      color: rgb(248,113,113);
      text-shadow: 0 0 6px rgba(248,113,113,0.25);
    }
  `;

  render() {
    return html`
      <div class="card">
        <h1 class="heading">${this.heading}</h1>
        <p class="subtitle">Use your account email to continue.</p>

        <form @submit=${this.onSubmit}>
          <div class="field">
            <label for="email">${this.emailLabel}</label>
            <input
              id="email"
              type="email"
              .value=${this.email}
              placeholder="you@example.com"
              autocomplete="email"
              @input=${(e: Event) => (this.email = (e.target as HTMLInputElement).value)}
              required
            />
          </div>

          <div class="field">
            <label for="password">${this.passwordLabel}</label>
            <input
              id="password"
              type="password"
              .value=${this.password}
              placeholder="••••••••"
              autocomplete="current-password"
              @input=${(e: Event) => (this.password = (e.target as HTMLInputElement).value)}
              required
            />
          </div>

          <div class="row">
            ${this.showRemember
              ? html`
                  <label class="remember">
                    <input
                      type="checkbox"
                      .checked=${this.remember}
                      @change=${(e: Event) => (this.remember = (e.target as HTMLInputElement).checked)}
                    />
                    <span>Remember me</span>
                  </label>
                `
              : nothing}
            <a class="forgot">Forgot password?</a>
          </div>

          <button type="submit" ?disabled=${this.submitting}>
            ${this.submitting ? 'Signing in…' : this.submitLabel}
          </button>

          ${this.error ? html`<div class="error">${this.error}</div>` : nothing}
        </form>
      </div>
    `;
  }

  private async onSubmit(event: Event) {
    event.preventDefault();
    this.error = null;

    if (!this.email || !this.password) {
      this.error = 'Please fill in both fields.';
      return;
    }

    this.submitting = true;

    const payload: LoginPayload = {
      email: this.email.trim(),
      password: this.password,
      remember: this.remember,
    };

    this.dispatchEvent(
      new CustomEvent<LoginPayload>('login', {
        detail: payload,
        bubbles: true,
        composed: true,
      }),
    );

    setTimeout(() => {
      this.submitting = false;
    }, 500);
  }
}
