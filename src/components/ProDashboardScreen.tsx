import { league, proTeams } from "@/lib/data";
import { Card, Hash, Pill } from "./ui";

function ProBadge() {
  return <span className="probadge">⚑ PRO</span>;
}

export function ProDashboardScreen({
  onSelectTeam,
}: {
  onSelectTeam: (teamId: string) => void;
}) {
  return (
    <div className="body">
      <div className="apphead">
        <h2>My Teams</h2>
        <ProBadge />
      </div>
      <Hash>
        WK {league.week} · {proTeams.length} LEAGUES SYNCED
      </Hash>

      <div className="rollup">
        <span className="fl">⚑</span>
        <div>
          Across your teams: <b>2 lineup questions</b> and <b>3 waiver targets</b>.
          Ask Audible to walk through them.
        </div>
      </div>

      <div className="pro-teams-scroll">
        {proTeams.map((team) => (
          <Card key={team.id} className="teamcard">
            <button
              type="button"
              className="teamcard-btn"
              onClick={() => onSelectTeam(team.id)}
            >
              <div className="tophd">
                <div>
                  <div className="lname">{team.leagueName}</div>
                  <div className="lmeta">
                    {team.platform} · {team.scoring} · {team.teamName}
                  </div>
                </div>
                <div className="rec">{team.record}</div>
              </div>
              <div className="mini">
                <span>
                  <b>{team.yourProjection}</b>{" "}
                  <span className="op">– {team.opponentProjection}</span>
                </span>
                <span className="lab">
                  WIN {team.winProbability}% · {team.kickoff}
                </span>
              </div>
              <div className={`bar${team.losing ? " losing" : ""}`}>
                <i style={{ width: `${team.winProbability}%` }} />
              </div>
              <div className="teamfoot">
                {team.tags.map((tag) => (
                  <Pill key={tag.label} variant={tag.variant}>
                    {tag.label}
                  </Pill>
                ))}
              </div>
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
