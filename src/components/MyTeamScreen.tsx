import { league, matchup, roster } from "@/lib/data";
import { AppHead, Card, Hash, Pill } from "./ui";

export function MyTeamScreen({ onStartSit }: { onStartSit: () => void }) {
  return (
    <div className="body">
      <AppHead title="My Team" badge={`WK ${league.week} · ${league.record}`} />
      <Hash>
        {league.name} · {league.scoring}
      </Hash>

      <Card>
        <div className="matchbar">
          <div className="team">
            {matchup.yourTeam}
            <small>YOU · PROJ</small>
          </div>
          <div className="score">
            <b>{matchup.yourProjection}</b> – {matchup.opponentProjection}
          </div>
          <div className="team" style={{ textAlign: "right" }}>
            {matchup.opponent}
            <small>OPP · PROJ</small>
          </div>
        </div>
        <div className="winprob">
          <i style={{ width: `${matchup.winProbability}%` }} />
        </div>
        <div className="winprob-lab">
          <span>WIN PROB {matchup.winProbability}%</span>
          <span>KICKOFF {matchup.kickoff}</span>
        </div>
      </Card>

      <Card className="roster-card">
        {roster.map((player) => (
          <div key={player.slot + player.name} className="slotrow">
            <span className="slot">{player.slot}</span>
            <div>
              <div className="pname">
                {player.name}
                {player.questionable && <span className="q">Q</span>}
              </div>
              <div className="pmeta">
                {player.team} · {player.matchup}
                {player.injury ? ` · ${player.injury}` : ""}
              </div>
            </div>
            <div className="proj">
              {player.projection}
              <small>PROJ</small>
            </div>
          </div>
        ))}
      </Card>

      <button type="button" className="lineup-cta" onClick={onStartSit}>
        <Pill variant="gold">⚑ 1 LINEUP QUESTION — ASK AUDIBLE</Pill>
      </button>
    </div>
  );
}
