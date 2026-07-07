import { league } from "@/lib/data";
import { AppHead, Hash, Pill } from "./ui";

export function AskScreen() {
  return (
    <div className="body">
      <AppHead title="Ask Audible" badge={`WK ${league.week}`} />
      <Hash>KNOWS YOUR ROSTER + SCORING</Hash>

      <div className="chat-area">
        <div className="bubble user">
          Nacua or Flowers in my flex this week?
        </div>
        <div className="bubble ai">
          <div className="verdict">⚑ Start Nacua</div>
          Nacua projects higher and gets a Seattle defense allowing the 4th-most
          half-PPR points to WRs. Flowers faces Cincinnati&apos;s top-10 pass
          defense and has a lower target share over the last 3 weeks.
          <div className="statchips">
            <Pill variant="gold">NACUA 16.8 PROJ</Pill>
            <Pill>FLOWERS 13.2 PROJ</Pill>
            <Pill>TGT SHARE 27% v 21%</Pill>
          </div>
          <div className="sources">
            <i />
            GROUNDED IN: PROJECTIONS · INJURY REPORT · MATCHUP DATA · YOUR
            SCORING
          </div>
        </div>
      </div>

      <div className="suggest">
        <Pill>Is Gibbs playing Sunday?</Pill>
        <Pill>Rank my RBs</Pill>
        <Pill>Trade help</Pill>
      </div>
      <div className="inputbar">
        Ask about your team…
        <div className="send">→</div>
      </div>
    </div>
  );
}
