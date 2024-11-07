"use client";

import React, { useState, useEffect } from "react";
import styles from "../main.module.scss";
import { Col, Form, Row } from "react-bootstrap";
import { ARENAS } from "@/constants/arenas";
import StrikerAvatar from "@/components/StrikerAvatar";
import TopStrikersWinRateTable from "./TopStrikersWinRateTable";
import MapHistoryByPlayer from "./MapHistoryByPlayer";
import EnemyPickFirst from "./EnemyPickFirst";
import FriendlyPickFirst from "./FriendlyPickFirst";

export default function DraftTool({ players }: { players: any }) {
  const playerNumbers = [1, 2, 3];

  const [selectedArena, setSelectedArena] = useState<string | undefined>(
    undefined
  );
  const [selectedPlayers, setSelectedPlayers] = useState<
    (string | undefined)[]
  >(Array(3).fill(undefined));
  const [topStrikersWinRate, setTopStrikersWinRate] = useState<any[]>([]);
  const [playerMapStrikers, setPlayerMapStrikers] = useState<any>({});

  const handlePlayerChange = (index: number, value: string | undefined) => {
    const updatedPlayers = [...selectedPlayers];
    updatedPlayers[index] = value;
    setSelectedPlayers(updatedPlayers);
  };
  const [pickOrder, setPickOrder] = useState("first");

  // Fetch top strikers by win rate for the selected arena
  useEffect(() => {
    if (!selectedArena) return;

    async function fetchMapData() {
      try {
        const playerIds = selectedPlayers.filter(Boolean).join(",");
        const response = await fetch(
          `/api/top-strikers?arena=${selectedArena}&players=${encodeURIComponent(
            playerIds
          )}`
        );
        const data = await response.json();
        console.log(data);

        // Organize top strikers by win rate for easy rendering
        const bansByMapWinRate = data.topStrikersOnMap.reduce(
          (acc: any, ban: any) => {
            if (!acc[ban.map]) acc[ban.map] = [];
            acc[ban.map].push(ban);
            return acc;
          },
          {}
        );
        console.log(bansByMapWinRate);
        setTopStrikersWinRate(bansByMapWinRate);
        console.log(data.playerMapStrikers);

        // Process player-specific map and striker data for display
        const playerData = data.playerMapStrikers.reduce(
          (acc: any, curr: any) => {
            const { playerId, map, matchResult, striker, wasGoalie, count } =
              curr;
            const role = wasGoalie ? "Goalies" : "Forwards";

            // Initialize structure for the player if it doesn't exist
            if (!acc[playerId]) acc[playerId] = {};
            if (!acc[playerId][map]) {
              acc[playerId][map] = {
                Wins: { Forwards: [], Goalies: [] },
                Losses: { Forwards: [], Goalies: [] },
              };
            }

            // Add striker to the correct category (Win/Loss, Forward/Goalie)
            acc[playerId][map][matchResult === "Win" ? "Wins" : "Losses"][
              role
            ].push({
              striker,
              count,
            });

            return acc;
          },
          {}
        );

        setPlayerMapStrikers(playerData);
      } catch (error) {
        console.error("Error fetching top strikers:", error);
      }
    }

    fetchMapData();
  }, [selectedArena, selectedPlayers]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <Form>
        <h4>Teammates</h4>
        {playerNumbers.map((playerNum, index) => {
          return (
            <Row
              key={playerNum}
              style={{ maxWidth: "600px", marginBottom: "16px" }}
            >
              <Col>
                <Form.Group>
                  <Form.Label>Player {playerNum}</Form.Label>
                  <Form.Select
                    name={"player" + playerNum}
                    required
                    defaultValue={undefined}
                    onChange={(e) =>
                      handlePlayerChange(index, e.target.value || undefined)
                    }
                  >
                    <option disabled value={undefined}>
                      Select player
                    </option>
                    <option value={undefined}>Anonymous</option>
                    {players.map((player: any) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>Role</Form.Label>
                  <Form.Select
                    name={"player" + playerNum + "role"}
                    required
                    defaultValue={playerNum % 3 === 0 ? "goalie" : "forward"}
                  >
                    <option value="forward">Forward</option>
                    <option value="goalie">Goalie</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          );
        })}
        <h4 style={{ marginTop: "32px" }}>Match Details</h4>
        <Form.Group style={{ maxWidth: "300px", marginBottom: "16px" }}>
          <Form.Label>Arena</Form.Label>
          <Form.Select
            name="arena"
            required
            defaultValue={undefined}
            onChange={(e) => setSelectedArena(e.target.value)}
          >
            <option value={undefined}>Select Arena</option>
            {ARENAS.map((arena) => (
              <option key={arena} value={arena}>
                {arena}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        <Form.Group style={{ maxWidth: "300px" }}>
          <Form.Label>Your team picks...</Form.Label>
          <Form.Select
            name="pickorder"
            required
            onChange={(e) => setPickOrder(e.target.value)}
          >
            <option value="first">First</option>
            <option value="second">Second</option>
          </Form.Select>
        </Form.Group>
      </Form>
      <TopStrikersWinRateTable topStrikersWinRate={topStrikersWinRate} />
      <MapHistoryByPlayer
        players={players}
        playerMapStrikers={playerMapStrikers}
        selectedArena={selectedArena}
      />
      {pickOrder === "first" && (
        <FriendlyPickFirst selectedArena={selectedArena} />
      )}
      {pickOrder === "second" && (
        <EnemyPickFirst selectedArena={selectedArena} />
      )}
    </div>
  );
}
