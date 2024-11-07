import { useState } from "react";
import { Form, Button } from "react-bootstrap";
import styles from "../main.module.scss";
import NavigationBar from "@/components/NavigationBar";
import { STRIKERS } from "@/constants/strikers"; // Import your strikers array here
import StrikerAvatar from "@/components/StrikerAvatar";

export default function WinRateCalculator() {
  return (
    <div className={styles.main}>
      <NavigationBar />
      <h2>Blu&apos;s Blazing</h2>
      <table>
        <thead>
          <tr>
            <th style={{ minWidth: "200px" }}>Map</th>
            <th>Good</th>
            <th>Meh</th>
            <th>Bad</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>AiMi&apos;s App</td>
            <td>-</td>
            <td>-</td>
            <td>
              <StrikerAvatar striker={"Luna"} />
              (bad as forward)
              <StrikerAvatar striker={"Rune"} />
              <StrikerAvatar striker={"Era"} />
              (only maybe as mid)
            </td>
          </tr>
          <tr>
            <td>Ahten City</td>
            <td>
              <StrikerAvatar striker={"Octavia"} />
              <br />
              Ideal bans:
              <StrikerAvatar striker={"Luna"} />
              <StrikerAvatar striker={"Asher"} />
              <StrikerAvatar striker={"Rune"} />
            </td>
            <td>
              <StrikerAvatar striker={"X"} />
              <StrikerAvatar striker={"Era"} />
            </td>
            <td>
              <StrikerAvatar striker={"Juliette"} />
              <StrikerAvatar striker={"Rasmus"} />
              <StrikerAvatar striker={"Finii"} />
            </td>
          </tr>
          <tr>
            <td>Atlas&apos;s Lab</td>
            <td>-</td>
            <td>-</td>
            <td>
              <StrikerAvatar striker={"Finii"} />
              <StrikerAvatar striker={"Drek'ar"} />
              <StrikerAvatar striker={"Era"} />
              <StrikerAvatar striker={"Luna"} />
              <StrikerAvatar striker={"Vyce"} rightMargin={false} /> (not
              forward)
            </td>
          </tr>
          <tr>
            <td>Demon Dais</td>
            <td>
              <b>Recommended</b>
              <ul>
                <li>
                  <StrikerAvatar striker={"Asher"} />
                  <StrikerAvatar striker={"Nao"} rightMargin={false} />
                  <StrikerAvatar striker={"Kai"} />
                </li>
                <li>
                  <StrikerAvatar striker={"Asher"} />
                  <StrikerAvatar striker={"Nao"} rightMargin={false} />
                  <StrikerAvatar striker={"Juno"} />
                </li>
                <li>
                  <StrikerAvatar striker={"Vyce"} />
                  <StrikerAvatar striker={"Nao"} rightMargin={false} />
                  <StrikerAvatar striker={"Drek'ar"} />
                </li>
                <li>
                  <StrikerAvatar striker={"Dubu"} />
                  <StrikerAvatar striker={"Juno"} rightMargin={false} />
                  <StrikerAvatar striker={"X"} />
                </li>
              </ul>
              Goalie: <StrikerAvatar striker={"Asher"} />
              <StrikerAvatar striker={"Vyce"} />
              <StrikerAvatar striker={"Finii"} />
              <StrikerAvatar striker={"Dubu"} />
              <br />
              Midfield: <StrikerAvatar striker={"Juno"} />
              <StrikerAvatar striker={"Nao"} />
              <br />
              Forward:
              <StrikerAvatar striker={"Kai"} />
              <StrikerAvatar striker={"X"} />
              <StrikerAvatar striker={"Kazan"} />
              <StrikerAvatar striker={"Zentaro"} />
              <StrikerAvatar striker={"Rasmus"} />
              <StrikerAvatar striker={"Drek'ar"} />
              <br />
            </td>
            <td>
              <StrikerAvatar striker={"AiMi"} />
            </td>
            <td>
              <StrikerAvatar striker={"Era"} />
              <StrikerAvatar striker={"Atlas"} />
              (maybe as midfield)
            </td>
          </tr>
          <tr>
            <td>Night Market</td>
            <td>
              <b>Recommended</b>
              <ul>
                <li>
                  <StrikerAvatar striker={"Asher"} />
                  <StrikerAvatar striker={"Estelle"} rightMargin={false} />
                  <StrikerAvatar striker={"AiMi"} />
                </li>
                <li>
                  <StrikerAvatar striker={"Asher"} />
                  <StrikerAvatar striker={"Vyce"} rightMargin={false} />
                  <StrikerAvatar striker={"Kai"} />
                </li>
              </ul>
              Asher forward & goalie; asher(/nao) estelle(/vyce)
              aimi(/kai/octavia)
            </td>
            <td>-</td>
            <td>
              <StrikerAvatar striker={"Mako"} />
              (don&apos;t play as forward) <StrikerAvatar striker={"Finii"} />
            </td>
          </tr>
          <tr>
            <td>Taiko Temple</td>
            <td>
              <b>Recommended</b>
              <ul>
                <li>
                  <StrikerAvatar striker={"Asher"} />
                  <StrikerAvatar striker={"Vyce"} rightMargin={false} />
                  <StrikerAvatar striker={"Nao"} rightMargin={false} />
                  <StrikerAvatar striker={"Kazan"} />
                  <StrikerAvatar striker={"Nao"} rightMargin={false} />
                  <StrikerAvatar striker={"Rune"} rightMargin={false} />
                  <StrikerAvatar striker={"Juno"} rightMargin={false} />
                  <StrikerAvatar striker={"Asher"} rightMargin={false} />
                  <StrikerAvatar striker={"Atlas"} rightMargin={false} />
                  <StrikerAvatar striker={"Octavia"} rightMargin={false} />
                  <StrikerAvatar striker={"Dubu"} rightMargin={false} />
                </li>
              </ul>
            </td>
            <td>-</td>
            <td>
              <StrikerAvatar striker={"Juliette"} />
              <StrikerAvatar striker={"Era"} />
              <StrikerAvatar striker={"Estelle"} />
              <StrikerAvatar striker={"Finii"} />
            </td>
          </tr>
        </tbody>
      </table>
      <h3>Tips</h3>
      <ul>
        <li>
          Ban based off of awakenings. There&apos;s Monumentalist on Demon Dais?
          Ban Finii/Rune
        </li>
      </ul>
    </div>
  );
}
