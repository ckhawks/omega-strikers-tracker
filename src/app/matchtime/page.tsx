"use client";

import { useEffect, useState } from "react";
import React from "react";

import styles from "../main.module.scss";
import { Button, Form } from "react-bootstrap";
import NavigationBar from "@/components/NavigationBar";
import { ARENAS } from "@/constants/arenas";

export default function MatchTime() {
  const [map, setMap] = useState("");
  const [setScoreA, setSetScoreA] = useState("");
  const [setScoreB, setSetScoreB] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [statGoals, setStatGoals] = useState("");
  const [statAssists, setStatAssists] = useState("");
  const [statSaves, setStatSaves] = useState("");
  const [statKnockouts, setStatKnockouts] = useState("");
  const [matchDurationMinutes, setMatchDurationMinutes] = useState("");
  const [matchDurationSeconds, setMatchDurationSeconds] = useState("");
  const [responseMessage, setResponseMessage] = useState("");

  const [players, setPlayers] = useState<any>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch the list of players from the API route
    const fetchPlayers = async () => {
      try {
        const response = await fetch("/api/players"); // Adjust the route if necessary
        const data = await response.json();
        setPlayers(data.players); // Assuming the API returns { players: [...] }
        // console.log(data.players);
      } catch (error) {
        console.error("Error fetching players:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []); // Empty dependency array to run once on component mount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch("/api/update-match-time", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        map,
        setScoreA,
        setScoreB,
        playerId,
        statGoals,
        statAssists,
        statSaves,
        statKnockouts,
        matchDurationMinutes,
        matchDurationSeconds,
      }),
    });

    const data = await res.json();
    setResponseMessage(data.message);
  };

  return (
    <div className={styles.main}>
      <NavigationBar />
      <h1>Update Match Time</h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "8px" }}
      >
        <Form.Label>Arena</Form.Label>
        <Form.Select
          name="arena"
          required
          defaultValue={"Ai.Mi's App"}
          onChange={(e) => setMap(e.target.value)}
        >
          <option disabled value={undefined}>
            Select Arena
          </option>
          {ARENAS.map((arena, index) => {
            return (
              <option key={arena} value={arena}>
                {arena}
              </option>
            );
          })}
        </Form.Select>
        <Form.Group>
          <label>
            Set Score A:
            <Form.Control
              type="text"
              value={setScoreA}
              onChange={(e) => setSetScoreA(e.target.value)}
            />
          </label>
          <label>
            Set Score B:
            <Form.Control
              type="text"
              value={setScoreB}
              onChange={(e) => setSetScoreB(e.target.value)}
            />
          </label>
        </Form.Group>

        <Form.Group>
          <label>
            Player:
            <Form.Select
              // name={"player" + props.number}
              required
              defaultValue={undefined}
              onChange={(e) => setPlayerId(e.target.value)}
            >
              <option disabled value={undefined}>
                Select player
              </option>
              <option value={undefined}>Anonymous</option>
              {players.map((player: any, index: number) => {
                return (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                );
              })}
            </Form.Select>
            {/* <input
            type="text"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
          /> */}
          </label>
          <label>
            Goals:
            <Form.Control
              type="number"
              value={statGoals}
              onChange={(e) => setStatGoals(e.target.value)}
            />
          </label>
          <label>
            Assists:
            <Form.Control
              type="number"
              value={statAssists}
              onChange={(e) => setStatAssists(e.target.value)}
            />
          </label>
          <label>
            Saves:
            <Form.Control
              type="number"
              value={statSaves}
              onChange={(e) => setStatSaves(e.target.value)}
            />
          </label>
          <label>
            KOs:
            <Form.Control
              type="number"
              value={statKnockouts}
              onChange={(e) => setStatKnockouts(e.target.value)}
            />
          </label>
        </Form.Group>
        <Form.Group>
          <label>
            Match Duration:
            <Form.Control
              type="number"
              value={matchDurationMinutes}
              onChange={(e) => setMatchDurationMinutes(e.target.value)}
            />
            <Form.Control
              type="number"
              value={matchDurationSeconds}
              onChange={(e) => setMatchDurationSeconds(e.target.value)}
            />
          </label>
        </Form.Group>
        <Button type="submit">Update Match with Time</Button>
      </form>
      {responseMessage && <p>{responseMessage}</p>}
    </div>
  );
}
