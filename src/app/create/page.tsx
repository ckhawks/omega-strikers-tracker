"use client";

import styles from "../main.module.scss";
import React, { useEffect, useState } from "react";
import { Button, Col, Form, Row } from "react-bootstrap";
import NavigationBar from "@/components/NavigationBar";
import { insertMatch } from "@/actions/insertMatch";
import { ARENAS } from "@/constants/arenas";
import { STRIKERS } from "@/constants/strikers";
import { RANKS } from "@/constants/ranks";
import SetTitle from "@/components/SetTitle";

const warningThresholds = {
  goals: 10,
  assists: 10,
  saves: 200,
  knockouts: 20,
  damage: 100000,
  shots: 200,
  redirects: 400,
  orbs: 100,
};

const PlayerSection = (props: { players: any; number: number }) => {
  const [warnings, setWarnings] = useState<{ [key: string]: boolean }>({});

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const field = name.replace(`player${props.number}`, ""); // Remove player prefix
    const numericValue = parseFloat(value);

    // @ts-ignore
    if (warningThresholds[field] !== undefined) {
      setWarnings((prev) => ({
        ...prev,
        // @ts-ignore
        [field]: numericValue > warningThresholds[field],
      }));
    }
  };

  return (
    <div style={{ border: "1px solid grey", padding: "1rem" }}>
      <Row>
        <Col>
          <Form.Group>
            <Form.Label>Player {props.number}</Form.Label>
            <Form.Select
              name={"player" + props.number}
              required
              defaultValue={undefined}
            >
              <option disabled value={undefined}>
                Select player
              </option>
              <option value={undefined}>Anonymous</option>
              {props.players.map((player: any, index: number) => {
                return (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                );
              })}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col>
          <Form.Group>
            <Form.Label>Striker</Form.Label>
            <Form.Select
              name={"player" + props.number + "striker"}
              required
              defaultValue={undefined}
            >
              <option disabled value={undefined}>
                Select Striker
              </option>
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
        <Col>
          <Form.Group>
            <Form.Label>Role</Form.Label>
            <Form.Select
              name={"player" + props.number + "role"}
              required
              defaultValue={props.number % 3 == 0 ? "goalie" : "forward"}
            >
              <option value={"forward"}>Forward</option>
              <option value="goalie">Goalie</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col>
          <Form.Group>
            <Form.Label>Rank</Form.Label>
            <Form.Select
              name={"player" + props.number + "rank"}
              required
              defaultValue={undefined}
            >
              <option disabled value={undefined}>
                Select Rank
              </option>
              {Object.entries(RANKS).map(([key, rank]) => {
                return (
                  <option key={key} value={key}>
                    {/* <img
                      src={"/rank_images/" + rank.imagePath}
                      alt={rank.name}
                      style={{ width: "20px", marginRight: "8px" }}
                    /> */}
                    {rank.name}
                  </option>
                );
              })}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      {/* <Row>
        <Col>
          <Form.Group>
            <Form.Label>Goals</Form.Label>
            <Form.Control
              name={"player" + props.number + "goals"}
              required
              type="number"
              min={0}
            />
          </Form.Group>
        </Col>
        <Col>
          <Form.Group>
            <Form.Label>Assists</Form.Label>
            <Form.Control
              name={"player" + props.number + "assists"}
              required
              type="number"
              min={0}
            />
          </Form.Group>
        </Col>
        <Col>
          <Form.Group>
            <Form.Label>Saves</Form.Label>
            <Form.Control
              name={"player" + props.number + "saves"}
              required
              type="number"
              min={0}
            />
          </Form.Group>
        </Col>
        <Col>
          <Form.Group>
            <Form.Label>KOs</Form.Label>
            <Form.Control
              name={"player" + props.number + "knockouts"}
              required
              type="number"
              min={0}
            />
          </Form.Group>
        </Col>
        <Col>
          <Form.Group>
            <Form.Label>Damage</Form.Label>
            <Form.Control
              name={"player" + props.number + "damage"}
              required
              type="number"
              min={0}
            />
          </Form.Group>
        </Col>
        <Col>
          <Form.Group>
            <Form.Label>Shots</Form.Label>
            <Form.Control
              name={"player" + props.number + "shots"}
              required
              type="number"
              min={0}
            />
          </Form.Group>
        </Col>
        <Col>
          <Form.Group>
            <Form.Label>Redirects</Form.Label>
            <Form.Control
              name={"player" + props.number + "redirects"}
              required
              type="number"
              min={0}
            />
          </Form.Group>
        </Col>
        <Col>
          <Form.Group>
            <Form.Label>Orbs</Form.Label>
            <Form.Control
              name={"player" + props.number + "orbs"}
              required
              type="number"
              min={0}
            />
          </Form.Group>
        </Col>
      </Row> */}
      <Row>
        {Object.entries(warningThresholds).map(([field, threshold]) => (
          <Col key={field}>
            <Form.Group>
              <Form.Label>
                {field.charAt(0).toUpperCase() + field.slice(1)}
              </Form.Label>
              <Form.Control
                name={`player${props.number}${field}`}
                required
                type="number"
                min={0}
                onChange={handleChange}
                style={{
                  backgroundColor: warnings[field] ? "#f1e1c3" : "white",
                  borderColor: warnings[field] ? "#f2c264" : "#dee2e6",
                }}
              />
            </Form.Group>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default function CreateMatch() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    // Check if the client-auth cookie is present
    const isAuthenticated = document.cookie
      .split("; ")
      .find((row) => row.startsWith("client-auth="));

    if (isAuthenticated) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

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

  // * DATE FIELD STUFF
  const getCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Initialize the state with the current date
  const [matchDate, setMatchDate] = useState(getCurrentDate());

  // Handle change event to update state
  const handleDateChange = (e: any) => {
    setMatchDate(e.target.value);
  };

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (event: any) => {
    event.preventDefault();

    // Get role values for each player
    const player1Role = event.target.player1role.value;
    const player2Role = event.target.player2role.value;
    const player3Role = event.target.player3role.value;

    const roles = [player1Role, player2Role, player3Role];

    // Count how many players have the "goalie" role
    const goalieCount = roles.filter((role) => role === "goalie").length;

    // Check if exactly one player has the "goalie" role
    if (goalieCount !== 1) {
      setErrorMessage(
        "Team A: Exactly one player must have the <b>Goalie</b> role."
      );
      return;
    }

    // Get role values for each player
    const player4Role = event.target.player4role.value;
    const player5Role = event.target.player5role.value;
    const player6Role = event.target.player6role.value;

    const roles2 = [player4Role, player5Role, player6Role];

    // Count how many players have the "goalie" role
    const goalieCount2 = roles2.filter((role) => role === "goalie").length;

    // Check if exactly one player has the "goalie" role
    if (goalieCount2 !== 1) {
      setErrorMessage(
        "Team B: Exactly one player must have the <b>Goalie</b> role."
      );
      return;
    }

    const formData = new FormData(event.target);

    // Call the server action directly
    const response = await insertMatch(formData);

    if (response?.error) {
      // Handle error state
      setErrorMessage(response?.message);
      setSuccessMessage("");
    } else {
      // Handle success state
      setSuccessMessage(response?.message || "");
      setErrorMessage("");

      // Reset the form
      event.target.reset();
      setMatchDate(getCurrentDate());
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <NavigationBar />
        <div className={styles.main}>
          <h1>Unauthorized.</h1>
        </div>
      </>
    );
  }

  return (
    <>
      <NavigationBar />
      <SetTitle title={"Add Match - OS Tracker"} />
      <div className={styles.main}>
        <h1>Add Match</h1>
        <Form onSubmit={handleSubmit}>
          <h3>Match Details</h3>
          <Form.Group>
            <Form.Label>Arena</Form.Label>
            <Form.Select
              name="arena"
              required
              defaultValue={undefined}
              style={{ maxWidth: "400px", marginBottom: ".5rem" }}
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
          </Form.Group>
          <Form.Group style={{ maxWidth: "400px", marginBottom: ".5rem" }}>
            <Form.Label>Match Duration</Form.Label>
            <Row style={{ maxWidth: "200px" }}>
              <Col>
                <Form.Control type="number" name="matchDurationMinutes" />
              </Col>
              :
              <Col>
                <Form.Control type="number" name="matchDurationSeconds" />
              </Col>
            </Row>
          </Form.Group>
          <Form.Group>
            <Form.Label>Match Date</Form.Label>
            <Form.Control
              disabled
              type="date"
              name="date"
              value={matchDate}
              onChange={handleDateChange}
            />
          </Form.Group>
          <br />
          <Row>
            <Col xxl={6} xl={12}>
              <h4>Team A</h4>
              <Form.Group>
                <Form.Label>Set Score</Form.Label>
                <Form.Control type="number" name="team1Score" min={0} max={3} />
              </Form.Group>
              <br />
              <PlayerSection players={players} number={1} />
              <PlayerSection players={players} number={2} />
              <PlayerSection players={players} number={3} />
            </Col>
            <Col xxl={6} xl={12}>
              <h4>Team B</h4>
              <Form.Group>
                <Form.Label>Set Score</Form.Label>
                <Form.Control type="number" name="team2Score" min={0} max={3} />
              </Form.Group>
              <br />
              <PlayerSection players={players} number={4} />
              <PlayerSection players={players} number={5} />
              <PlayerSection players={players} number={6} />
            </Col>
          </Row>
          <br />
          <Button type="submit">Create match</Button>
          {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
          {successMessage && <p style={{ color: "green" }}>{successMessage}</p>}
        </Form>
      </div>
    </>
  );
}
