"use client";

import Accordion from "react-bootstrap/Accordion";
import styles from "../main.module.scss";
import StrikerAvatar from "@/components/StrikerAvatar";

export default function DuoWinRatesAccordion({
  duosByMap,
  allMapsDuos,
}: {
  duosByMap: any;
  allMapsDuos: any;
}) {
  return (
    <>
      <Accordion>
        {/* All Maps Accordion Item */}
        <Accordion.Item eventKey="allMaps">
          <Accordion.Header>All Maps</Accordion.Header>
          <Accordion.Body>
            <table>
              <thead>
                <tr>
                  <th>Striker 1</th>
                  <th>Role</th>
                  <th>Striker 2</th>
                  <th>Role</th>
                  <th>Win Rate (%)</th>
                  <th>Matches Played</th>
                </tr>
              </thead>
              <tbody>
                {allMapsDuos.map((duo: any) => (
                  <tr key={`${duo.striker1}-${duo.striker2}-allMaps`}>
                    <td>
                      <StrikerAvatar striker={duo.striker1} />
                      {duo.striker1}
                    </td>
                    <td>{duo.role1 ? "Goalie" : "Forward"}</td>
                    <td>
                      <StrikerAvatar striker={duo.striker2} />
                      {duo.striker2}
                    </td>
                    <td>{duo.role2 ? "Goalie" : "Forward"}</td>
                    <td>{duo.winRate}%</td>
                    <td>{duo.matchesPlayed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Accordion.Body>
        </Accordion.Item>
        {Object.entries(duosByMap).map(
          ([map, duoList]: [map: any, duoList: any], index) => (
            <Accordion.Item eventKey={index.toString()} key={map}>
              <Accordion.Header>{map}</Accordion.Header>
              <Accordion.Body>
                <table>
                  <thead>
                    <tr>
                      <th>Striker 1</th>
                      <th>Role</th>
                      <th>Striker 2</th>
                      <th>Role</th>
                      <th>Win Rate (%)</th>
                      <th>Matches Played</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duoList.map((duo: any) => (
                      <tr key={`${duo.striker1}-${duo.striker2}-${map}`}>
                        <td>
                          <StrikerAvatar striker={duo.striker1} />
                          {duo.striker1}
                        </td>
                        <td>{duo.role1 ? "Goalie" : "Forward"}</td>
                        <td>
                          <StrikerAvatar striker={duo.striker2} />
                          {duo.striker2}
                        </td>
                        <td>{duo.role2 ? "Goalie" : "Forward"}</td>
                        <td>{duo.winRate}%</td>
                        <td>{duo.matchesPlayed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Accordion.Body>
            </Accordion.Item>
          )
        )}
      </Accordion>
    </>
  );
}
