"use client";

import { useEffect, useState } from "react";
import styles from "../main.module.scss";
import StrikerAvatar from "@/components/StrikerAvatar";

// Sortable table column component
export default function StrikerWinRates({
  strikerWinRates,
}: {
  strikerWinRates: any;
}) {
  const [sortConfig, setSortConfig] = useState({
    column: "",
    direction: "asc",
  });

  const handleSort = (column: any) => {
    let direction = "asc";
    if (sortConfig.column === column && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ column, direction });
    console.log("yeah");
  };

  // Organize data into grouped format
  const groupedData = strikerWinRates.reduce((acc: any, row: any) => {
    const {
      striker,
      map,
      goalie_win_rate,
      goalie_matches_played,
      forward_win_rate,
      forward_matches_played,
      total_goalie_win_rate,
      total_goalie_matches,
      total_forward_win_rate,
      total_forward_matches,
      total_combined_win_rate,
      total_matches,
    } = row;

    if (!acc[striker]) acc[striker] = { maps: {}, total: {} };

    // Populate map-specific data
    acc[striker].maps[map] = {
      forward: forward_win_rate,
      forwardMatches: forward_matches_played,
      goalie: goalie_win_rate,
      goalieMatches: goalie_matches_played,
    };

    // Populate total data
    acc[striker].total = {
      forwardWinRate: total_forward_win_rate,
      forwardMatches: total_forward_matches,
      goalieWinRate: total_goalie_win_rate,
      goalieMatches: total_goalie_matches,
      combinedWinRate: total_combined_win_rate,
      totalMatches: total_matches,
    };

    return acc;
  }, {});

  const sortedData = Object.entries(groupedData).sort(
    (
      [strikerA, dataA]: [strikerA: string, dataA: any],
      [strikerB, dataB]: [strikerB: string, dataB: any]
    ) => {
      const { column, direction } = sortConfig;
      let aValue, bValue, aMatches, bMatches;

      // Primary sorting value
      if (column === "striker") {
        aValue = strikerA;
        bValue = strikerB;
      } else if (column.includes("total")) {
        aValue = dataA.total[column.replace("total_", "")];
        bValue = dataB.total[column.replace("total_", "")];
        aMatches = dataA.total[`${column.replace("total_", "")}Matches`];
        bMatches = dataB.total[`${column.replace("total_", "")}Matches`];
      } else {
        const [map, role] = column.split("_");
        aValue = dataA.maps[map]?.[role];
        bValue = dataB.maps[map]?.[role];
        aMatches = dataA.maps[map]?.[`${role}Matches`];
        bMatches = dataB.maps[map]?.[`${role}Matches`];
      }

      // Convert values to numeric or handle nulls for "N/A"
      const aValNum =
        aValue === null || aValue === undefined ? -Infinity : +aValue;
      const bValNum =
        bValue === null || bValue === undefined ? -Infinity : +bValue;
      const sortDirection = direction === "asc" ? 1 : -1;

      // Primary sort
      if (aValNum !== bValNum)
        return aValNum > bValNum ? sortDirection : -sortDirection;

      // Secondary sort by matches played if primary values are equal
      if (aMatches === bMatches) return 0;
      return aMatches > bMatches ? sortDirection : -sortDirection;
    }
  );

  const [sortedStrikerData, setSortedStrikerData] = useState(sortedData);

  useEffect(() => {
    setSortedStrikerData(sortedData);
  }, [strikerWinRates, sortConfig]);

  const maps = Array.from(new Set(strikerWinRates.map((row: any) => row.map)));

  // Now use sortedStrikerData in the return statement below:
  return (
    <table className={styles.winRateTable}>
      <thead>
        <tr>
          <th onClick={() => handleSort("striker")}>Striker</th>
          {maps.map((map: any) => (
            <th key={map} colSpan={2}>
              <center onClick={() => handleSort(map)}>{map}</center>
            </th>
          ))}
          <th colSpan={3}>
            <center onClick={() => handleSort("total_combined_win_rate")}>
              Total
            </center>
          </th>
        </tr>
        <tr>
          <th></th>
          {maps.map((map) => (
            <>
              <th
                key={`${map}-forward`}
                onClick={() => handleSort(`${map}_forward`)}
              >
                Forward
              </th>
              <th
                key={`${map}-goalie`}
                onClick={() => handleSort(`${map}_goalie`)}
              >
                Goalie
              </th>
            </>
          ))}
          <th onClick={() => handleSort("total_forward_win_rate")}>Forward</th>
          <th onClick={() => handleSort("total_goalie_win_rate")}>Goalie</th>
          <th onClick={() => handleSort("total_combined_win_rate")}>
            Combined
          </th>
        </tr>
      </thead>
      <tbody>
        {sortedStrikerData.map(([striker, data]: [striker: any, data: any]) => (
          <tr key={striker}>
            <td>
              <StrikerAvatar striker={striker} />
              {striker}
            </td>
            {maps.map((map: any) => (
              <>
                <td key={`${striker}-${map}-forward`}>
                  {data.maps[map]?.forward ? (
                    <>
                      <span>{data.maps[map]?.forward}%</span>{" "}
                      <span className={styles.small}>
                        {data.maps[map].forwardMatches}
                      </span>
                    </>
                  ) : (
                    <span className={styles.subtext}>N/A</span>
                  )}
                </td>
                <td key={`${striker}-${map}-goalie`}>
                  {data.maps[map]?.goalie ? (
                    <>
                      <span>{data.maps[map]?.goalie}%</span>{" "}
                      <span className={styles.small}>
                        {data.maps[map].goalieMatches}
                      </span>
                    </>
                  ) : (
                    <span className={styles.subtext}>N/A</span>
                  )}
                </td>
              </>
            ))}
            <td>
              {data.total.forwardWinRate ? (
                <>
                  <span>{data.total.forwardWinRate}%</span>{" "}
                  <span className={styles.small}>
                    {data.total.forwardMatches}
                  </span>
                </>
              ) : (
                <span className={styles.subtext}>N/A</span>
              )}
            </td>
            <td>
              {data.total.goalieWinRate ? (
                <>
                  <span>{data.total.goalieWinRate}%</span>{" "}
                  <span className={styles.small}>
                    {data.total.goalieMatches}
                  </span>
                </>
              ) : (
                <span className={styles.subtext}>N/A</span>
              )}
            </td>
            <td>
              {data.total.combinedWinRate ? (
                <>
                  <span>{data.total.combinedWinRate}%</span>{" "}
                  <span className={styles.small}>
                    {data.total.totalMatches}
                  </span>
                </>
              ) : (
                <span className={styles.subtext}>N/A</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
