import StrikerAvatar from "@/components/StrikerAvatar";
import { STRIKERS } from "@/constants/strikers";
import { Col, Form } from "react-bootstrap";
import styles from "../main.module.scss";

export default function FriendlyPickFirst({
  topStrikersWinRate,
}: {
  topStrikersWinRate?: any;
}) {
  return (
    <div>
      <h3>Draft</h3>
      <h5>Pick 1: Friendly</h5>
      <Col style={{ maxWidth: "400px" }}>
        <Form.Group>
          <Form.Label>Striker</Form.Label>
          <Form.Select
            // name={"player" + props.number + "striker"}
            required
            defaultValue={undefined}
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
      </Col>
    </div>
  );

  return <></>;
}
