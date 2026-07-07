import { league, waiverTargets } from "@/lib/data";
import { AppHead, Card, Hash, Pill } from "./ui";

export function WaiversScreen() {
  return (
    <div className="body">
      <AppHead
        title="Waivers"
        badge={`FAAB $${league.faabRemaining} LEFT`}
      />
      <Hash>PICKED FOR YOUR ROSTER</Hash>
      <div className="deadline">
        <i />
        WAIVERS CLEAR WED 3:00 AM · {league.claimsSet} CLAIMS SET
      </div>

      {waiverTargets.map((target) => (
        <Card key={target.name} className="wcard">
          <div className="top">
            <div>
              <div className="pname">{target.name}</div>
              <div className="pmeta">
                {target.position} · {target.team} · {target.rostered} ROSTERED
              </div>
            </div>
            <div className="faab">
              BID ${target.suggestedBid}
              <small>SUGGESTED</small>
            </div>
          </div>
          <div className="why">{target.why}</div>
          <div className="foot">
            {target.tags.map((tag) => (
              <Pill key={tag.label} variant={tag.variant}>
                {tag.label}
              </Pill>
            ))}
            {target.dropSuggestion && (
              <Pill>DROP: {target.dropSuggestion}</Pill>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
