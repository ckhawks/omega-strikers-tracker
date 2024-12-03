"use client";

import { useState } from "react";
import { Form, Button } from "react-bootstrap";
import styles from "../main.module.scss";
import NavigationBar from "@/components/NavigationBar";
import { STRIKERS } from "@/constants/strikers"; // Import your strikers array here
import SetTitle from "@/components/SetTitle";

export default function WinRateCalculator() {
  const [teamA, setTeamA] = useState(["", "", ""]);
  const [teamB, setTeamB] = useState(["", "", ""]);
  const [winRate, setWinRate] = useState<number | null>(null);

  const handleSubmit = async () => {
    // Send the selected strikers to the server
    const response = await fetch("/api/calculate-win-rate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ teamA, teamB }),
    });
    const data = await response.json();
    setWinRate(data.winRate);
  };

  const handleSelectChange = (
    team: "A" | "B",
    index: number,
    value: string
  ) => {
    if (team === "A") {
      setTeamA((prev) => {
        const newTeam = [...prev];
        newTeam[index] = value;
        return newTeam;
      });
    } else {
      setTeamB((prev) => {
        const newTeam = [...prev];
        newTeam[index] = value;
        return newTeam;
      });
    }
  };

  const roleLabels = ["Forward", "Forward", "Goalie"];

  return (
    <>
      <NavigationBar />
      <SetTitle title={"Win Rate Calculator - OS Tracker"} />
      <div className={styles.main}>
        <div className={styles.winRateCalculator}>
          <h2>Team Win Rate Calculator</h2>

          {/* Team A */}
          <div className={styles.teamInput}>
            <h3>Team A</h3>
            {teamA.map((striker, index) => (
              <Form.Group
                key={`teamA-striker-${index}`}
                className={styles.strikerSelect}
              >
                <Form.Label>{roleLabels[index]}</Form.Label>
                <Form.Select
                  value={striker}
                  onChange={(e) =>
                    handleSelectChange("A", index, e.target.value)
                  }
                  aria-label={`Select ${roleLabels[index]} for Team A`}
                >
                  <option disabled value="">
                    Select Striker
                  </option>
                  {STRIKERS.map((striker) => (
                    <option key={striker} value={striker}>
                      {striker}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            ))}
          </div>

          {/* Team B */}
          <div className={styles.teamInput}>
            <h3>Team B</h3>
            {teamB.map((striker, index) => (
              <Form.Group
                key={`teamB-striker-${index}`}
                className={styles.strikerSelect}
              >
                <Form.Label>{roleLabels[index]}</Form.Label>
                <Form.Select
                  value={striker}
                  onChange={(e) =>
                    handleSelectChange("B", index, e.target.value)
                  }
                  aria-label={`Select ${roleLabels[index]} for Team B`}
                >
                  <option disabled value="">
                    Select Striker
                  </option>
                  {STRIKERS.map((striker) => (
                    <option key={striker} value={striker}>
                      {striker}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            ))}
          </div>

          <Button onClick={handleSubmit}>Calculate Win Rate</Button>

          {winRate !== null && (
            <div className={styles.result}>
              <h3>Estimated Win Rate for Team A: {winRate}%</h3>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
