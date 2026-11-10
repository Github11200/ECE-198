export default function ExerciseIllustration({
  type,
}: {
  type: "curl" | "stand" | "heel";
}) {
  return (
    <svg
      viewBox="0 0 200 160"
      aria-hidden="true"
      className="exercise-illustration"
    >
      <path d="M22 140h156" stroke="#c5d7d5" strokeWidth="1.5" />
      <g
        fill="none"
        stroke="#58664a"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {type === "curl" ? (
          <>
            <path d="M57 85v52m0-20h68m-15 0v20M57 87h48v30" stroke="#a7b9af" />
            <circle cx="92" cy="30" r="12" fill="#e6c3a5" stroke="none" />
            <path d="M85 47l-7 42h31l13 46h17" strokeWidth="8" />
            <path
              d="M85 52l22 30 18-24"
              stroke="var(--primary)"
              strokeWidth="7"
            />
            <path
              d="M117 51l16 8m-17-13-4 9m24-1-4 9"
              stroke="#40575f"
              strokeWidth="4"
            />
          </>
        ) : type === "stand" ? (
          <>
            <path d="M49 88v50m0-25h45m-3-24v49M49 89h42" stroke="#a7b9af" />
            <circle cx="113" cy="25" r="12" fill="#e6c3a5" stroke="none" />
            <path d="M109 43l-12 46 18 46h18M99 91l-19 44H66" strokeWidth="8" />
            <path
              d="M107 49l22 27 15 2"
              stroke="var(--primary)"
              strokeWidth="7"
            />
            <path
              d="M59 45V25m0 0-6 7m6-7 6 7"
              stroke="#a16c4f"
              strokeWidth="2.5"
            />
          </>
        ) : (
          <>
            <path d="M145 75v63m-12-63h25" stroke="#a7b9af" />
            <circle cx="91" cy="25" r="12" fill="#e6c3a5" stroke="none" />
            <path d="M91 44v48l-5 39h17M93 91l19 40h13" strokeWidth="8" />
            <path d="M96 51l24 23h25" stroke="var(--primary)" strokeWidth="7" />
            <path
              d="M67 118v-20m0 0-5 6m5-6 5 6"
              stroke="#a16c4f"
              strokeWidth="2.5"
            />
          </>
        )}
      </g>
    </svg>
  );
}
