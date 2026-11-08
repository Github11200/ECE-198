"use client";

import { useState } from "react";
import {
  dayScore,
  exerciseHistory,
  historyDate,
  scoreBand,
} from "@/lib/exercise-history";

export default function ProgressChart() {
  const [period, setPeriod] = useState("all");
  const days = [
    ...(period === "4" ? exerciseHistory.slice(0, 4) : exerciseHistory),
  ].reverse();
  const values = days.map(dayScore);
  const x = (index: number) => 56 + (index / (days.length - 1)) * 590;
  const y = (value: number) => 204 - value * 1.8;
  const points = values
    .map((value, index) => `${x(index)},${y(value)}`)
    .join(" ");

  return (
    <section className="surface progress-chart">
      <div className="card-heading">
        <div>
          <h2>Your recent scores</h2>
          <p>Average exercise score per day · out of 100</p>
        </div>
        <label className="sr-only" htmlFor="chart-period">
          Score history range
        </label>
        <select
          id="chart-period"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
        >
          <option value="all">All recorded days</option>
          <option value="4">Last 4 recorded days</option>
        </select>
      </div>
      <div className="chart-legend">
        <span>
          Illustrative demo scores · {historyDate(days[0].date, true)}–
          {historyDate(days.at(-1)!.date, true)} 2026
        </span>
      </div>
      <svg
        viewBox="0 0 700 250"
        role="img"
        aria-label={`Average demo scores out of 100: ${days.map((day, index) => `${historyDate(day.date, true)}: ${values[index]}`).join(", ")}`}
        className="line-chart"
      >
        {[0, 20, 40, 60, 80, 100].map((value) => (
          <g key={value}>
            <line
              x1="56"
              x2="654"
              y1={y(value)}
              y2={y(value)}
              stroke="var(--line)"
            />
            <text x="28" y={y(value) + 4}>
              {value}
            </text>
          </g>
        ))}
        <polygon points={`56,204 ${points} 646,204`} fill="var(--chart-fill)" />
        <polyline
          points={points}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {days.map((day, index) => (
          <g key={day.date}>
            <circle
              cx={x(index)}
              cy={y(values[index])}
              r="5"
              fill={scoreBand(values[index]).colour}
              stroke="white"
              strokeWidth="2"
            >
              <title>{`${historyDate(day.date)}: ${values[index]} out of 100 (${scoreBand(values[index]).name})`}</title>
            </circle>
            <text x={x(index)} y="234" textAnchor="middle">
              {historyDate(day.date, true)}
            </text>
          </g>
        ))}
      </svg>
    </section>
  );
}
