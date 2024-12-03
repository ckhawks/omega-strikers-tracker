import styles from "../main.module.scss";
import NavigationBar from "@/components/NavigationBar";
import CountersControl from "./CountersControl";

export const metadata = {
  title: "Counters Tool - OS Tracker",
};

export default function CounterStrikerAnalysis() {
  return (
    <>
      <NavigationBar />
      <div className={styles.main}>
        <h1>Counter Striker Analysis</h1>
        <CountersControl />
      </div>
    </>
  );
}
