"use client";

import { useState } from "react";
import { Form, Button, Col, Row, Table } from "react-bootstrap";
import styles from "../main.module.scss";
import NavigationBar from "@/components/NavigationBar";
import { STRIKERS } from "@/constants/strikers";
import { ARENAS } from "@/constants/arenas";
import StrikerAvatar from "@/components/StrikerAvatar";
import { RANKS } from "@/constants/ranks";

export default function WinRateCalculator() {
  const [teamA, setTeamA] = useState([
    { striker: "", role: "" },
    { striker: "", role: "" },
    { striker: "", role: "" },
  ]);
  const [teamB, setTeamB] = useState([
    { striker: "", role: "" },
    { striker: "", role: "" },
    { striker: "", role: "" },
  ]);

  const [arena, setArena] = useState("");
  const [sort, setSort] = useState("date");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: any) => {
    setLoading(true);
    e.preventDefault();

    const searchParams = {
      arena,
      teamA: teamA.filter(({ striker }) => striker),
      teamB: teamB.filter(({ striker }) => striker),
      sort: sort,
    };

    try {
      const response = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchParams),
      });
      const data = await response.json();
      setResults(data.matches);
      console.log(data);
    } catch (error) {
      console.error("Error fetching match data:", error);
    }
    setLoading(false);
  };

  const handleSelectChange = (
    team: any,
    index: number,
    field: any,
    value: any
  ) => {
    if (team === "A") {
      setTeamA((prev) =>
        prev.map((player, i) =>
          i === index ? { ...player, [field]: value } : player
        )
      );
    } else if (team === "B") {
      setTeamB((prev) =>
        prev.map((player, i) =>
          i === index ? { ...player, [field]: value } : player
        )
      );
    }
  };

  return (
    <div className={styles.main}>
      <NavigationBar />
      <div className={styles.winRateCalculator}>
        <h2>Search for Matches</h2>

        <Row>
          <Col style={{ maxWidth: "300px" }}>
            <Form.Group>
              <Form.Label>Arena</Form.Label>
              <Form.Select
                name="arena"
                required
                defaultValue={undefined}
                onChange={(e) => setArena(e.target.value)}
              >
                <option value={undefined}>Any</option>
                {ARENAS.map((arena, index) => {
                  return (
                    <option key={arena} value={arena}>
                      {arena}
                    </option>
                  );
                })}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col style={{ maxWidth: "300px" }}>
            <Form.Group>
              <Form.Label>Sort by...</Form.Label>
              <Form.Select
                name="sort"
                required
                defaultValue={"date"}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value={"date"}>Date</option>
                <option value={"arena"}>Arena</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
        <br />
        <Row style={{ maxWidth: "1200px" }}>
          <Col xs={12} md={6}>
            {/* Team A */}
            <div className={styles.teamInput}>
              <h3>Team A</h3>
              {teamA.map((striker: any, index) => (
                <Row key={striker}>
                  <Col>
                    <Form.Group
                      key={`teamA-striker-${index}`}
                      className={styles.strikerSelect}
                    >
                      <Form.Label>Striker {index + 1}</Form.Label>
                      <Form.Select
                        value={striker.striker}
                        onChange={(e) =>
                          handleSelectChange(
                            "A",
                            index,
                            "striker",
                            e.target.value
                          )
                        }
                        aria-label={`Select ${[index]} for Team A`}
                      >
                        <option value="">Any</option>
                        {STRIKERS.map((striker) => (
                          <option key={striker} value={striker}>
                            {striker}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <br />
                  </Col>
                  <Col>
                    <Form.Group
                      key={`teamA-striker-${index}-role`}
                      className={styles.strikerSelect}
                    >
                      <Form.Label>Role {index + 1}</Form.Label>
                      <Form.Select
                        value={striker.role}
                        onChange={(e) =>
                          handleSelectChange("A", index, "role", e.target.value)
                        }
                        aria-label={`Select ${[index]} role for Team A`}
                      >
                        <option value="any">Any</option>
                        <option value="forward">Forward</option>
                        <option value="goalie">Goalie</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              ))}
            </div>
          </Col>

          <Col xs={12} md={6}>
            {/* Team B */}
            <div className={styles.teamInput}>
              <h3>Team B</h3>
              {teamB.map((striker: any, index) => (
                <Row key={striker}>
                  <Col>
                    <Form.Group
                      key={`teamB-striker-${index}`}
                      className={styles.strikerSelect}
                    >
                      <Form.Label>Striker {index + 1}</Form.Label>
                      <Form.Select
                        value={striker.striker}
                        onChange={(e) =>
                          handleSelectChange(
                            "B",
                            index,
                            "striker",
                            e.target.value
                          )
                        }
                        aria-label={`Select ${[index]} for Team B`}
                      >
                        <option value="">Any</option>
                        {STRIKERS.map((striker) => (
                          <option key={striker} value={striker}>
                            {striker}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <br />
                  </Col>
                  <Col>
                    <Form.Group
                      key={`teamB-striker-${index}-role`}
                      className={styles.strikerSelect}
                    >
                      <Form.Label>Role {index + 1}</Form.Label>
                      <Form.Select
                        value={striker.role}
                        onChange={(e) =>
                          handleSelectChange("B", index, "role", e.target.value)
                        }
                        aria-label={`Select ${[index]} role for Team B`}
                      >
                        <option value="any">Any</option>
                        <option value="forward">Forward</option>
                        <option value="goalie">Goalie</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              ))}
            </div>
          </Col>
        </Row>
        <br />

        <Button disabled={loading} onClick={handleSearch}>
          Find matches
        </Button>

        <br />
        {/* Results Table */}
        {results.length > 0 && (
          <Table
            striped
            bordered
            hover
            responsive
            className="mt-4"
            style={{ maxWidth: "1000px" }}
          >
            <thead>
              <tr>
                <th>Arena</th>
                <th>Team A Strikers</th>
                <th>Score</th>
                <th>Team B Strikers</th>
                <th>Average Rank</th>
                <th>Full Data</th>
              </tr>
            </thead>
            <tbody>
              {results.map((match: any, index: number) => {
                const teamAClass =
                  match.team1Score > match.team2Score
                    ? styles.winningTeam
                    : styles.losingTeam;
                const teamBClass =
                  match.team2Score > match.team1Score
                    ? styles.winningTeam
                    : styles.losingTeam;

                return (
                  <tr key={index}>
                    <td>{match.arena}</td>
                    <td className={teamAClass}>
                      {match.teamA.map((striker: any, index2: number) => (
                        <StrikerAvatar
                          striker={striker}
                          rightMargin={index2 === 1}
                          key={`teamA-striker-${index2}`}
                        />
                      ))}
                    </td>
                    <td>
                      {match.team1Score} - {match.team2Score}
                    </td>
                    <td className={teamBClass}>
                      {match.teamB.map((striker: any, index2: number) => (
                        <StrikerAvatar
                          striker={striker}
                          rightMargin={index2 === 1}
                          key={`teamB-striker-${index2}`}
                        />
                      ))}
                    </td>
                    <td>
                      {match.averageRank ? (
                        <img
                          src={`/rank_images/${
                            // @ts-ignore
                            RANKS[Math.round(match.averageRank)].imagePath
                          }`}
                          width={32}
                          style={{ marginRight: "8px" }}
                        />
                      ) : (
                        ""
                      )}
                      {
                        // @ts-ignore
                        RANKS[Math.round(match.averageRank)].name ?? "N/A"
                      }
                    </td>
                    <td>
                      <a
                        href={`/match/${match.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {results.length === 0 && <p>No results found.</p>}
      </div>
    </div>
  );
}
