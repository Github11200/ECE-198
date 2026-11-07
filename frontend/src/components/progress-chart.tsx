"use client";

import { useState } from "react";

export default function ProgressChart() {
  const [period, setPeriod] = useState("4");
  const values = period === "4" ? [6, 6, 7, 8] : [3, 4, 4, 5, 6, 6, 7, 8];
  const labels =
    period === "4"
      ? ["19 Oct", "26 Oct", "2 Nov", "9 Nov"]
      : [
          "21 Sep",
          "28 Sep",
          "5 Oct",
          "12 Oct",
          "19 Oct",
          "26 Oct",
          "2 Nov",
          "9 Nov",
        ];
  const points = values
    .map((v, i) => `${56 + (i / (values.length - 1)) * 590},${202 - v * 15}`)
    .join(" ");
  return (
    <section className="surface progress-chart">
      <div className="card-heading">
        <div>
          <h2>Your progress over time</h2>
          <p>Completed reps · seated arm curl</p>
        </div>
        <label className="sr-only" htmlFor="chart-period">
          Progress period
        </label>
        <select
          id="chart-period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="4">Last 4 weeks</option>
          <option value="8">Last 8 weeks</option>
        </select>
      </div>
      <div className="chart-legend">
        <span>
          <i /> Completed reps
        </span>
        <span>
          <i className="target-line" /> Current target: 10
        </span>
      </div>
      <svg
        viewBox="0 0 700 250"
        role="img"
        aria-label={`Completed curl reps over ${period} weeks: ${values.join(", ")}. Current target: 10 reps.`}
        className="line-chart"
      >
        {[0, 4, 8, 12].map((v) => (
          <g key={v}>
            <line
              x1="56"
              x2="654"
              y1={202 - v * 15}
              y2={202 - v * 15}
              stroke="var(--line)"
            />
            <text x="30" y={207 - v * 15}>
              {v}
            </text>
          </g>
        ))}
        <line
          x1="56"
          x2="654"
          y1="52"
          y2="52"
          stroke="#b0bebb"
          strokeDasharray="5 5"
        />
        <polygon points={`56,202 ${points} 646,202`} fill="var(--chart-fill)" />
        <polyline
          points={points}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {values.map((v, i) => (
          <g key={i}>
            <circle
              cx={56 + (i / (values.length - 1)) * 590}
              cy={202 - v * 15}
              r="5"
              fill="var(--primary)"
              stroke="white"
              strokeWidth="2"
            >
              <title>{`${labels[i]}: ${v} reps`}</title>
            </circle>
            <text
              x={56 + (i / (values.length - 1)) * 590}
              y="233"
              textAnchor="middle"
            >
              {labels[i]}
            </text>
          </g>
        ))}
      </svg>
    </section>
  );
}
