"use client";

import { useState, useEffect } from "react";
import { Table, Form, Col, Button, Row } from "react-bootstrap";
import StrikerAvatar from "@/components/StrikerAvatar";
import { STRIKERS } from "@/constants/strikers";
import styles from "../main.module.scss";

export default function CountersControl() {
  const [firstStriker, setFirstStriker] = useState("");
  const [secondStriker, setSecondStriker] = useState("");
  const [firstRole, setFirstRole] = useState<boolean | undefined>(undefined); // true for goalie, false for forward
  const [secondRole, setSecondRole] = useState<boolean | undefined>(undefined); // true for goalie, false for forward
  const [counterStrikers, setCounterStrikers] = useState<any>([]);

  const fetchCounterStrikers = async () => {
    if (!firstStriker || !secondStriker) return;

    const roleParams = `&firstRole=${
      firstRole !== undefined ? firstRole : ""
    }&secondRole=${secondRole !== undefined ? secondRole : ""}`;
    try {
      const response = await fetch(
        `/api/counter-strikers?firstStriker=${encodeURIComponent(
          firstStriker
        )}&secondStriker=${encodeURIComponent(secondStriker)}${roleParams}`
      );
      const data = await response.json();
      setCounterStrikers(data.counterStrikers);
    } catch (error) {
      console.error("Error fetching counter strikers:", error);
    }
  };

  useEffect(() => {
    fetchCounterStrikers();
  }, [firstStriker, secondStriker, firstRole, secondRole]);

  return (
    <div>
      <Form>
        <Row>
          <Col>
            <Form.Group>
              <Form.Label>Striker</Form.Label>
              <Form.Select
                required
                // defaultValue={undefined}
                value={firstStriker}
                onChange={(e) => setFirstStriker(e.target.value)}
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
            <Form.Group>
              <Form.Label>First Striker Role</Form.Label>
              <Form.Select
                // @ts-ignore
                value={firstRole}
                onChange={(e) =>
                  setFirstRole(
                    e.target.value === "goalie"
                      ? true
                      : e.target.value === "forward"
                      ? false
                      : undefined
                  )
                }
              >
                <option value="">Any Role</option>
                <option value="goalie">Goalie</option>
                <option value="forward">Forward</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col>
            <Form.Group>
              <Form.Label>Striker</Form.Label>
              <Form.Select
                required
                // defaultValue={undefined}
                value={secondStriker}
                onChange={(e) => setSecondStriker(e.target.value)}
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
            <Form.Group>
              <Form.Label>Second Striker Role</Form.Label>
              <Form.Select
                // @ts-ignore
                value={secondRole}
                onChange={(e) =>
                  setSecondRole(
                    e.target.value === "goalie"
                      ? true
                      : e.target.value === "forward"
                      ? false
                      : undefined
                  )
                }
              >
                <option value="">Any Role</option>
                <option value="goalie">Goalie</option>
                <option value="forward">Forward</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
        <Button variant="primary" onClick={fetchCounterStrikers}>
          Analyze
        </Button>
      </Form>

      {counterStrikers.length > 0 && (
        <div className={styles.counterStrikerTable}>
          <h4>Counter Strikers</h4>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Striker</th>
                <th>Role</th>
                <th>Combined Win Rate (%)</th>
                <th>
                  Win Rate vs{"  "}
                  <StrikerAvatar striker={firstStriker} />
                  {firstStriker}
                </th>
                <th>
                  Win Rate vs{"  "}
                  <StrikerAvatar striker={secondStriker} />
                  {secondStriker}
                </th>
              </tr>
            </thead>
            <tbody>
              {counterStrikers.map((striker: any, index: number) => (
                <tr key={index}>
                  <td>
                    <StrikerAvatar striker={striker.opponentStriker} />
                    {striker.opponentStriker}
                  </td>
                  <td>{striker.opponentRole ? "Goalie" : "Forward"}</td>
                  <td>{Number(striker.averageWinRate).toFixed(2)}%</td>
                  <td>
                    {striker.matchesAgainstStrikerA !== null ? (
                      <>
                        {Number(striker.winRateAgainstStrikerA).toFixed(2)}%{" "}
                        <span className={styles.small}>
                          {striker.matchesAgainstStrikerA}
                        </span>
                      </>
                    ) : (
                      "N/A"
                    )}
                  </td>
                  <td>
                    {striker.matchesAgainstStrikerB !== null ? (
                      <>
                        {Number(striker.winRateAgainstStrikerB).toFixed(2)}%{" "}
                        <span className={styles.small}>
                          {striker.matchesAgainstStrikerB}
                        </span>
                      </>
                    ) : (
                      "N/A"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
