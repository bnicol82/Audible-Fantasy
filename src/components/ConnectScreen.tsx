export function ConnectScreen({
  onConnect,
}: {
  onConnect: () => void;
}) {
  return (
    <>
      <div className="body">
        <div className="logo">
          Aud<em>i</em>ble
        </div>
        <div className="logosub">
          Your team, your scoring, real answers. Connect a league and ask
          anything.
        </div>
        <button type="button" className="btn primary" onClick={onConnect}>
          Connect Sleeper <span className="tag">~10 SEC</span>
        </button>
        <button type="button" className="btn" onClick={onConnect}>
          Connect Yahoo <span className="tag">OAUTH</span>
        </button>
        <button type="button" className="btn" style={{ opacity: 0.45 }}>
          Connect ESPN <span className="tag">BETA</span>
        </button>
        <div className="connect-note">
          No league? <u>Enter your roster manually</u>
          <br />
          Read-only · We never change your lineup
        </div>
      </div>
    </>
  );
}
