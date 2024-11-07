import StrikerAvatar from "@/components/StrikerAvatar";
import Tooltip from "@/components/Tooltip";
import { STRIKERS } from "@/constants/strikers";
import { useEffect, useState } from "react";
import { Col, Form, Table } from "react-bootstrap";
import styles from "../main.module.scss";

export default function EnemyPickFirst({
  selectedArena,
}: {
  selectedArena: any;
}) {
  const [enemyStriker, setEnemyStriker] = useState<string | undefined>(
    undefined
  );
  const [counterStrikers, setCounterStrikers] = useState<any[]>([]);

  // Fetch top counter strikers when the enemy striker is selected
  useEffect(() => {
    if (!enemyStriker || !selectedArena) return;

    async function fetchCounterStrikers() {
      try {
        const response = await fetch(
          `/api/top-counter-strikers?arena=${encodeURIComponent(
            selectedArena
          )}&enemyStriker=${encodeURIComponent(enemyStriker || "")}`
        );
        const data = await response.json();
        console.log(data);
        setCounterStrikers(data.topCounterStrikers);
      } catch (error) {
        console.error("Error fetching counter strikers:", error);
      }
    }

    fetchCounterStrikers();
  }, [enemyStriker, selectedArena]);

  console.log(counterStrikers);

  return (
    <div>
      <h3>Draft</h3>
      <h5>Pick 1: Enemy</h5>
      <Col style={{ maxWidth: "400px" }}>
        <Form.Group>
          <Form.Label>Striker</Form.Label>
          <Form.Select
            // name={"player" + props.number + "striker"}
            required
            defaultValue={undefined}
            value={enemyStriker}
            onChange={(e) => setEnemyStriker(e.target.value || undefined)}
          >
            <option value={undefined}>Select Striker</option>
            {STRIKERS.map((striker, index) => {
              return (
                <option key={striker} value={striker}>
                  {striker}
                </option>
              );
            })}
          </Form.Select>
        </Form.Group>
      </Col>
      {enemyStriker && counterStrikers.length > 0 && (
        <div>
          <h5 style={{ marginTop: "32px" }}>
            Best Counter Picks Against {enemyStriker} on {selectedArena}
          </h5>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Striker</th>
                <th>vs Opponent</th>
                <th>
                  <Tooltip
                    text={
                      "The overall win rate of the striker against the opponent."
                    }
                  >
                    <span className={styles["tooltippable"]}>
                      Global Win Rate (%)
                    </span>
                  </Tooltip>
                </th>
                <th>
                  <Tooltip
                    text={
                      "The number of matches the striker has played against the opponent on all arenas."
                    }
                  >
                    <span className={styles["tooltippable"]}>
                      Global Matches
                    </span>
                  </Tooltip>
                </th>
                <th>
                  <Tooltip
                    text={
                      "The win rate of the striker against the opponent on the selected arena."
                    }
                  >
                    <span className={styles["tooltippable"]}>
                      Arena Win Rate (%)
                    </span>
                  </Tooltip>
                </th>
                <th>Opponent Arena Matches</th>
                <th>Arena win rate</th>
              </tr>
            </thead>
            <tbody>
              {counterStrikers.map((strikerData: any, index: number) => (
                <tr key={index}>
                  <td>
                    <StrikerAvatar striker={strikerData.striker} />
                    {strikerData.striker}
                  </td>
                  <td>
                    <StrikerAvatar striker={strikerData.opponent} />
                    {strikerData.opponent}
                  </td>
                  <td>{Number(strikerData.globalWinRate).toFixed(2)}%</td>
                  <td>{strikerData.matchesPlayed}</td>
                  <td>
                    {strikerData.opponentArenaWinRate !== null
                      ? `${(
                          100 - Number(strikerData.opponentArenaWinRate)
                        ).toFixed(2)}%`
                      : "N/A"}
                  </td>
                  <td>{strikerData.opponentArenaMatchesPlayed || 0}</td>
                  <td>{Number(strikerData.arenaWinRate).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return <></>;
}
