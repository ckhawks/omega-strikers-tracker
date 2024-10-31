"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "../main.module.scss";
import { STRIKER_IMAGES } from "@/constants/strikers";
import { Col, Form, FormLabel, Row } from "react-bootstrap";

export default function StrikersTable({
  strikersStats,
  excludeFriendlies,
}: {
  strikersStats: any;
  excludeFriendlies: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checked, setChecked] = useState(excludeFriendlies);

  useEffect(() => {
    setChecked(excludeFriendlies);
  }, [excludeFriendlies]);

  const handleCheckboxChange = (e) => {
    const newChecked = e.target.checked;
    setChecked(newChecked);

    // Update the URL parameter without a page reload
    const params = new URLSearchParams(searchParams);
    if (newChecked) {
      params.set("excludeFriendlies", "true");
    } else {
      params.delete("excludeFriendlies");
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <>
      <h3>Strikers - Combined</h3>
      <Form.Check
        type="checkbox"
        checked={checked}
        onChange={handleCheckboxChange}
        label={"Exclude registered players data"}
      />

      <table>
        <thead>
          <tr>
            <th>Striker</th>
            <th>Winrate</th>
            <th>Matches</th>
            <th>Goals</th>
            <th>Assists</th>
            <th>Saves</th>
            <th>KOs</th>
            <th>Damage</th>
            <th>Dmg per KO</th>
            <th>Shots</th>
            <th>Redirects</th>
            <th>Orbs</th>
          </tr>
        </thead>
        <tbody>
          {strikersStats.map((striker: any) => (
            <tr key={striker.striker}>
              <td>
                <img
                  width={32}
                  // @ts-ignore
                  src={`/strikers/${STRIKER_IMAGES[striker.striker]}`}
                  alt={striker.striker}
                  style={{ marginRight: "4px" }}
                />{" "}
                {striker.striker}
              </td>
              <td>{striker.winRate}%</td>
              <td>{striker.timesPlayed}</td>
              <td>{striker.averageGoals}</td>
              <td>{striker.averageAssists}</td>
              <td>{striker.averageSaves}</td>
              <td>{striker.averageKnockouts}</td>
              <td>{Math.round(striker.averageDamage)}</td>
              <td>{Math.round(striker.averageDamagePerKnockout)}</td>
              <td>{striker.averageShots}</td>
              <td>{striker.averageRedirects}</td>
              <td>{striker.averageOrbs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
