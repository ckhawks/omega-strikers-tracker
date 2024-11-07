import StrikerAvatar from "@/components/StrikerAvatar";
import React from "react";
import styles from "../main.module.scss";

export default function MapHistoryByPlayer({
  playerMapStrikers,
  selectedArena,
  players,
}: {
  playerMapStrikers: any;
  selectedArena: any;
  players: any;
}) {
  if (Object.keys(playerMapStrikers).length > 0) {
    return (
      <div>
        <h3>Previous Results on {selectedArena}</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Player</th>
              <th>Wins - Forwards</th>
              <th>Losses - Forwards</th>
              <th>Wins - Goalies</th>
              <th>Losses - Goalies</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(playerMapStrikers).map(([playerId, maps]) => (
              <React.Fragment key={playerId}>
                {
                  // @ts-ignore
                  Object.entries(maps).map(([mapName, mapData]) => {
                    const {
                      // @ts-ignore
                      Wins = { Forwards: [], Goalies: [] },
                      // @ts-ignore
                      Losses = { Forwards: [], Goalies: [] },
                    } = mapData;

                    return (
                      <tr key={`${playerId}-${mapName}`}>
                        <td>
                          {players.find((p) => p.id === playerId)?.name ||
                            "Unknown Player"}
                        </td>

                        {/* Wins - Forwards */}

                        <td>
                          <div style={{ display: "flex", gap: "8px" }}>
                            {Wins.Forwards.length > 0
                              ? Wins.Forwards.map(
                                  (striker: any, index: number) => (
                                    <div
                                      key={index}
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                      }}
                                    >
                                      <StrikerAvatar
                                        striker={striker.striker}
                                        rightMargin={false}
                                      />
                                      <span style={{ fontSize: "12px" }}>
                                        {striker.count}x
                                      </span>
                                    </div>
                                  )
                                )
                              : "N/A"}
                          </div>
                        </td>
                        {/* Losses - Forwards */}
                        <td>
                          <div style={{ display: "flex", gap: "8px" }}>
                            {Losses.Forwards.length > 0
                              ? Losses.Forwards.map(
                                  (striker: any, index: number) => (
                                    <div
                                      key={index}
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                      }}
                                    >
                                      <StrikerAvatar
                                        striker={striker.striker}
                                        rightMargin={false}
                                      />
                                      <span style={{ fontSize: "12px" }}>
                                        {striker.count}x
                                      </span>
                                    </div>
                                  )
                                )
                              : "N/A"}
                          </div>
                        </td>
                        {/* Wins - Goalies */}
                        <td>
                          <div style={{ display: "flex", gap: "8px" }}>
                            {Wins.Goalies.length > 0
                              ? Wins.Goalies.map(
                                  (striker: any, index: number) => (
                                    <div
                                      key={index}
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                      }}
                                    >
                                      <StrikerAvatar
                                        striker={striker.striker}
                                        rightMargin={false}
                                      />
                                      <span style={{ fontSize: "12px" }}>
                                        {striker.count}x
                                      </span>
                                    </div>
                                  )
                                )
                              : "N/A"}
                          </div>
                        </td>
                        {/* Losses - Goalies */}
                        <td>
                          <div style={{ display: "flex", gap: "8px" }}>
                            {Losses.Goalies.length > 0
                              ? Losses.Goalies.map(
                                  (striker: any, index: number) => (
                                    <div
                                      key={index}
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                      }}
                                    >
                                      <StrikerAvatar
                                        striker={striker.striker}
                                        rightMargin={false}
                                      />
                                      <span style={{ fontSize: "12px" }}>
                                        {striker.count}x
                                      </span>
                                    </div>
                                  )
                                )
                              : "N/A"}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                }
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return <></>;
}
