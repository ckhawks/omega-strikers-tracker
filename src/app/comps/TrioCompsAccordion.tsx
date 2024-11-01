"use client";

import Accordion from "react-bootstrap/Accordion";
import styles from "../main.module.scss";
import StrikerAvatar from "@/components/StrikerAvatar";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Form } from "react-bootstrap";

export default function TrioCompsAccordion({
  allMapsTrios,
  triosByMap,
  excludeNonRegistered,
}: {
  allMapsTrios: any;
  triosByMap: any;
  excludeNonRegistered: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checked, setChecked] = useState(excludeNonRegistered);

  // Update local state when prop changes
  useEffect(() => {
    setChecked(excludeNonRegistered);
  }, [excludeNonRegistered]);

  const handleCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const isChecked = e.target.checked;
      setChecked(isChecked);

      // Create a new URLSearchParams instance with all current params
      const params = new URLSearchParams(searchParams.toString());

      // Update the URL params based on checkbox state
      params.set("excludeNonRegistered", isChecked.toString());

      // Preserve existing pathname and update only the search params
      router.push(`${window.location.pathname}?${params.toString()}`);
    },
    [searchParams, router]
  );
  return (
    <>
      <Form.Check
        type="checkbox"
        id="exclude-non-registered"
        checked={checked}
        onChange={handleCheckboxChange}
        label="Exclude non-registered players' comps"
      />
      <Accordion>
        {/* All Maps Accordion Item */}
        <Accordion.Item eventKey="allMapsTrios">
          <Accordion.Header>All Maps</Accordion.Header>
          <Accordion.Body>
            <table>
              <thead>
                <tr>
                  <th>Forward 1</th>
                  <th>Forward 2</th>
                  <th>Goalie</th>
                  <th>Win Rate (%)</th>
                  <th>Matches Played</th>
                </tr>
              </thead>
              <tbody>
                {allMapsTrios.map((trio: any) => (
                  <tr
                    key={`${trio.striker1}-${trio.striker2}-${trio.goalie}-allMaps`}
                  >
                    <td>
                      <StrikerAvatar striker={trio.striker1} />
                      {trio.striker1}
                    </td>
                    <td>
                      <StrikerAvatar striker={trio.striker2} />
                      {trio.striker2}
                    </td>
                    <td>
                      <StrikerAvatar striker={trio.goalie} />
                      {trio.goalie}
                    </td>
                    <td>{trio.winRate}%</td>
                    <td>{trio.matchesPlayed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Accordion.Body>
        </Accordion.Item>
        {/* Map-Specific Accordion Items */}
        {Object.entries(triosByMap).map(
          ([map, trioList]: [map: any, trioList: any], index) => (
            <Accordion.Item eventKey={`map-${index}`} key={map}>
              <Accordion.Header>{map}</Accordion.Header>
              <Accordion.Body>
                <table>
                  <thead>
                    <tr>
                      <th>Forward 1</th>
                      <th>Forward 2</th>
                      <th>Goalie</th>
                      <th>Win Rate (%)</th>
                      <th>Matches Played</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trioList.map((trio: any) => (
                      <tr
                        key={`${trio.striker1}-${trio.striker2}-${trio.goalie}-${map}`}
                      >
                        <td>
                          <StrikerAvatar striker={trio.striker1} />
                          {trio.striker1}
                        </td>
                        <td>
                          <StrikerAvatar striker={trio.striker2} />
                          {trio.striker2}
                        </td>
                        <td>
                          <StrikerAvatar striker={trio.goalie} />
                          {trio.goalie}
                        </td>
                        <td>{trio.winRate}%</td>
                        <td>{trio.matchesPlayed}</td>
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
