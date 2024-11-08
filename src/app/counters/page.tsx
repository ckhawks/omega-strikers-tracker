import styles from "../main.module.scss";
import NavigationBar from "@/components/NavigationBar";
import CountersControl from "./CountersControl";

export default function CounterStrikerAnalysis() {
  return (
    <div className={styles.main}>
      <NavigationBar />
      <h1>Counter Striker Analysis</h1>
      <CountersControl />
    </div>
  );
}
