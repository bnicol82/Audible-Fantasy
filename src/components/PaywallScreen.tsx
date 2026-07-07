import { paywallFeatures, paywallPlans } from "@/lib/data";

export function PaywallScreen({ onStartTrial }: { onStartTrial: () => void }) {
  return (
    <div className="body">
      <div className="pro-hero">
        <div className="flagmark">
          Go <em>Pro</em>
        </div>
        <p>
          Every team. Unlimited answers.
          <br />
          Cheaper than FantasyPros at every plan.
        </p>
      </div>

      <div className="cmp">
        <div className="row hd">
          <span />
          <span className="c free">FREE</span>
          <span className="c pro-hd">PRO</span>
        </div>
        {paywallFeatures.map((row) => (
          <div key={row.feature} className="row">
            <span>{row.feature}</span>
            <span className="c free">{row.free}</span>
            <span className="c pro">{row.pro}</span>
          </div>
        ))}
      </div>

      <div className="plans">
        {paywallPlans.map((plan) => (
          <div key={plan.id} className={`plan${plan.hero ? " hero" : ""}`}>
            {plan.badge && <div className="best">{plan.badge}</div>}
            <div className="per">{plan.label}</div>
            <div className="amt">{plan.price}</div>
            <div className="eq">{plan.detail}</div>
          </div>
        ))}
      </div>

      <button type="button" className="btn primary" onClick={onStartTrial}>
        Start 7-day free trial
      </button>
      <div className="fine">
        NO CHARGE UNTIL TRIAL ENDS · CANCEL ANYTIME
        <br />
        SECURE CHECKOUT VIA STRIPE
      </div>
    </div>
  );
}
