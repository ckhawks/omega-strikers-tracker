import styles from "./BackButton.module.scss";

import Link from "next/link";
import { ArrowLeft } from "react-feather";

const BackButton = (props: { to: string; text: string }) => {
  return (
    <Link href={props.to} className={styles.BackButton}>
      <ArrowLeft style={{ height: "14px" }} />
      {props.text}
    </Link>
  );
};
export default BackButton;
