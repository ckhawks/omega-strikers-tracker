import StrikerAvatar from "@/components/StrikerAvatar";
import styles from "../main.module.scss";

export default function TopStrikersWinRateTable({
  topStrikersWinRate,
}: {
  topStrikersWinRate: any;
}) {
  if (topStrikersWinRate.length !== null) {
    return (
      <div>
        {/* Section for Win Rate-Based Bans */}
        <div className={styles["maps-container"]}>
          {Object.entries(topStrikersWinRate).map(([map, strikers]: any) => (
            <div key={map} className={styles["map-section"]}>
              <div>
                <h2>{map}</h2>
                <p>
                  Strikers with a win rate at 50% or higher on the selected map;
                  excluding data from registered players (opponents/randoms
                  only)
                </p>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Striker</th>
                    <th>Role</th>
                    <th>Win Rate (%)</th>
                    <th>Matches</th>
                  </tr>
                </thead>
                <tbody>
                  {strikers.map((striker: any) => (
                    <tr key={`${striker.striker}-${striker.role}`}>
                      <td>
                        <StrikerAvatar striker={striker.striker} />
                        {striker.striker}
                      </td>
                      <td>{striker.role}</td>
                      <td>{striker.winRate}%</td>
                      <td>{striker.matchesPlayed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return <></>;
}
