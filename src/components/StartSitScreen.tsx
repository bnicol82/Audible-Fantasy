import { startSitComparison } from "@/lib/data";
import { AppHead, Card, Hash } from "./ui";

export function StartSitScreen({ onAskWhy }: { onAskWhy: () => void }) {
  const { playerA, playerB, stats, verdict } = startSitComparison;

  return (
    <div className="body">
      <AppHead title="Start / Sit" badge="FLEX · WK 5" />
      <Hash>DECISION 1 OF 1</Hash>

      <Card>
        <div className="vs">
          <div className="pcard">
            <div className={`avatar${playerA.isWinner ? " win" : ""}`}>
              {playerA.initials}
            </div>
            <div className="nm">{playerA.name}</div>
            <div className="sub">
              {playerA.position} · {playerA.team} · {playerA.matchup}
            </div>
          </div>
          <div className="vsx">VS</div>
          <div className="pcard">
            <div className={`avatar${playerB.isWinner ? " win" : ""}`}>
              {playerB.initials}
            </div>
            <div className="nm">{playerB.name}</div>
            <div className="sub">
              {playerB.position} · {playerB.team} · {playerB.matchup}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        {stats.map((row) => (
          <div key={row.label} className="cmprow">
            <span className={`v${row.winner === "a" ? " hi" : ""}`}>
              {row.a}
            </span>
            <span className="lab">{row.label}</span>
            <span className={`v${row.winner === "b" ? " hi" : ""}`}>
              {row.b}
            </span>
          </div>
        ))}
      </Card>

      <div className="verdictbar">
        <b>⚑ {playerA.name.split(" ").pop()}</b>
        <span>{verdict}</span>
      </div>
      <button type="button" className="askwhy" onClick={onAskWhy}>
        ASK AUDIBLE WHY →
      </button>
    </div>
  );
}
