import { scoreBand, scoreBands } from "@/lib/exercise-history";
import styles from "./session-history.module.css";

export default function ScoreBadge({
  score,
  large = false,
}: {
  score: number;
  large?: boolean;
}) {
  return (
    <span
      className={`${styles.score} ${large ? styles.scoreLarge : ""}`}
      data-band={scoreBand(score).name}
      aria-label={`Demo score: ${score} out of 100`}
    >
      <b>{score}</b>
      <span>/ 100</span>
    </span>
  );
}

export function ScoreLegend() {
  return (
    <div className={styles.legend} aria-label="Score colour ranges">
      <span className={styles.legendLabel}>Demo score ranges</span>
      {scoreBands.map((band) => (
        <span
          className={styles.legendItem}
          key={band.name}
          data-band={band.name}
        >
          <i aria-hidden="true" />
          <span>
            {band.min}–{band.max}
          </span>
          <span className="sr-only"> {band.name}</span>
        </span>
      ))}
    </div>
  );
}
