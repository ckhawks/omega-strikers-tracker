"use client";

import Accordion from "react-bootstrap/Accordion";
import { useEffect, useState } from "react";
import styles from "../main.module.scss";
import StrikerAvatar from "@/components/StrikerAvatar";

// Component that displays solo counters and accordion view
export default function SoloCounterStats({
  soloCounters,
}: {
  soloCounters: any;
}) {
  // Filter solo counter data for matchesPlayed >= 2
  const filteredSoloCounters = soloCounters.filter(
    (counter: any) => counter.matchesPlayed >= 2
  );

  // Group and sort solo counter data by striker
  const countersByStriker = filteredSoloCounters.reduce(
    (acc: any, counter: any) => {
      if (!acc[counter.striker]) {
        acc[counter.striker] = [];
      }
      acc[counter.striker].push(counter);
      return acc;
    },
    {}
  );

  // Sort the countersByStriker object alphabetically by striker name
  const sortedStrikers = Object.keys(countersByStriker).sort();

  return (
    <div className={styles.soloCounterContainer}>
      <div className={styles.soloCounterTable}>
        <h2>Solo Counter Win Rates</h2>
        <table>
          <thead>
            <tr>
              <th>Striker</th>
              <th>Countered Opponent</th>
              <th>Win Rate (%)</th>
              <th>Matches Played</th>
            </tr>
          </thead>
          <tbody>
            {filteredSoloCounters.map((counter: any) => (
              <tr key={`${counter.striker}-${counter.opponent}`}>
                <td>
                  <StrikerAvatar striker={counter.striker} />
                  {counter.striker}
                </td>
                <td>
                  <StrikerAvatar striker={counter.opponent} />
                  {counter.opponent}
                </td>
                <td>{counter.winRate}%</td>
                <td>{counter.matchesPlayed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.accordionView}>
        <h2>Counter Stats by Striker</h2>
        <Accordion>
          {sortedStrikers.map((striker: string, index: number) => (
            <Accordion.Item eventKey={index.toString()} key={striker}>
              <Accordion.Header>
                <StrikerAvatar striker={striker} />
                {striker}
              </Accordion.Header>
              <Accordion.Body>
                <table>
                  <thead>
                    <tr>
                      <th>Opponent</th>
                      <th>Win Rate (%)</th>
                      <th>Matches Played</th>
                    </tr>
                  </thead>
                  <tbody>
                    {countersByStriker[striker].map((opponent: any) => (
                      <tr key={`${striker}-${opponent.opponent}`}>
                        <td>
                          <StrikerAvatar striker={opponent.opponent} />
                          {opponent.opponent}
                        </td>
                        <td>{opponent.winRate}%</td>
                        <td>{opponent.matchesPlayed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
