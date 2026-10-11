import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Two-panel frame for sign-in and register. The left panel shows what the product is about: SLA clocks. */
@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); min-height: 100dvh; background: var(--bg); }
    .hero { position: relative; display: flex; flex-direction: column; justify-content: space-between; gap: 40px; padding: 44px 56px;
      background: var(--side); color: #cfe3e8; overflow: hidden; }
    .brand { display: flex; align-items: center; gap: 10px; color: #fff; font-weight: 720; font-size: 19px; letter-spacing: -0.02em; }
    h2 { color: #fff; font-size: clamp(28px, 3.4vw, 42px); line-height: 1.08; letter-spacing: -0.03em; max-width: 14ch; font-weight: 700; }
    .lede { margin-top: 16px; max-width: 46ch; font-size: 15.5px; line-height: 1.55; color: #a9c2c9; }

    .board { display: flex; flex-direction: column; gap: 14px; max-width: 480px; }
    .rowx { display: grid; grid-template-columns: 1fr auto; gap: 6px 14px; padding: 14px 16px; border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px; background: rgba(255, 255, 255, 0.04); }
    .rowx .t { color: #fff; font-weight: 600; font-size: 14px; }
    .rowx .s { font-weight: 650; font-size: 13px; font-variant-numeric: tabular-nums; }
    .track { grid-column: 1 / -1; height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.1); overflow: hidden; }
    .fill { height: 100%; border-radius: 3px; width: 0; animation: grow 1.1s cubic-bezier(0.22, 0.8, 0.3, 1) forwards; }
    .a .fill { background: #4cc38f; --w: 38%; } .a .s { color: #6fd6a8; }
    .b .fill { background: #f0b04a; --w: 84%; animation-delay: 0.12s; } .b .s { color: #f0b04a; }
    .c .fill { background: #f07166; --w: 100%; animation-delay: 0.24s; } .c .s { color: #f48b82; }
    @keyframes grow { to { width: var(--w); } }

    .panel-side { display: flex; align-items: center; justify-content: center; padding: 40px 28px; }
    .card { width: 100%; max-width: 400px; }

    @media (max-width: 900px) {
      :host { grid-template-columns: 1fr; }
      .hero { display: none; }
    }
  `,
  template: `
    <section class="hero" aria-hidden="true">
      <div class="brand">
        <svg width="28" height="28" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="8" fill="#0a6b7c" />
          <rect x="7" y="9" width="18" height="3" rx="1.5" fill="#fff" opacity=".35" /><rect x="7" y="9" width="12" height="3" rx="1.5" fill="#fff" />
          <rect x="7" y="15" width="18" height="3" rx="1.5" fill="#fff" opacity=".35" /><rect x="7" y="15" width="16" height="3" rx="1.5" fill="#f5b74a" />
          <rect x="7" y="21" width="18" height="3" rx="1.5" fill="#fff" opacity=".35" /><rect x="7" y="21" width="6" height="3" rx="1.5" fill="#5fd0dc" />
        </svg>
        SmartOps
      </div>
      <div>
        <h2>Every incident has a clock.</h2>
        <p class="lede">SmartOps tracks response and resolution time against your SLA, so the right person sees the right incident before it slips.</p>
      </div>
      <div class="board">
        <div class="rowx a"><span class="t">Payment gateway timeout</span><span class="s">2h 40m left</span><div class="track"><div class="fill"></div></div></div>
        <div class="rowx b"><span class="t">VPN drops for remote staff</span><span class="s">18m left</span><div class="track"><div class="fill"></div></div></div>
        <div class="rowx c"><span class="t">Checkout API returning 500</span><span class="s">Overdue 6m</span><div class="track"><div class="fill"></div></div></div>
      </div>
    </section>
    <section class="panel-side">
      <div class="card"><ng-content /></div>
    </section>
  `,
})
export class AuthLayoutComponent {}
