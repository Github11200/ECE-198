export type Participant = {
  id: string;
  name: string;
  initials: string;
  colour: string;
  stage: string;
  completed: number;
  target: number;
  attendance: number;
  note: string;
  lastSession: string;
  status: "On track" | "Check in";
};

export const participants: Participant[] = [
  {
    id: "P01",
    name: "Alex Morgan",
    initials: "AM",
    colour: "mint",
    stage: "Week 4 of 8",
    completed: 8,
    target: 10,
    attendance: 8,
    note: "Comfortable with the current plan. Review curl target at the next appointment.",
    lastSession: "9 Nov 2026",
    status: "On track",
  },
  {
    id: "P02",
    name: "Jordan Patel",
    initials: "JP",
    colour: "sand",
    stage: "Week 3 of 8",
    completed: 6,
    target: 8,
    attendance: 5,
    note: "Requested a check-in before the next group session.",
    lastSession: "6 Nov 2026",
    status: "Check in",
  },
  {
    id: "P03",
    name: "Sam Chen",
    initials: "SC",
    colour: "blue",
    stage: "Week 5 of 8",
    completed: 12,
    target: 12,
    attendance: 10,
    note: "Current rep target met. Discuss the next programme review.",
    lastSession: "9 Nov 2026",
    status: "On track",
  },
  {
    id: "P04",
    name: "Taylor Wilson",
    initials: "TW",
    colour: "rose",
    stage: "Week 2 of 8",
    completed: 5,
    target: 8,
    attendance: 3,
    note: "Still settling into the group routine. Leave time for questions.",
    lastSession: "9 Nov 2026",
    status: "On track",
  },
  {
    id: "P05",
    name: "Casey Martin",
    initials: "CM",
    colour: "lavender",
    stage: "Week 4 of 8",
    completed: 10,
    target: 10,
    attendance: 7,
    note: "Prefers the morning group. Review progress at the next check-in.",
    lastSession: "9 Nov 2026",
    status: "On track",
  },
];

export const exercisePlan = [
  {
    id: "curl",
    name: "Seated arm curl",
    category: "Upper body",
    target: "2 sets · 10 reps",
    equipment: "Chair · light hand weight",
    description:
      "Your current upper-body exercise. Your instructor will review the rep target at your next check-in.",
    last: "8 / 10 reps",
    next: "Review on 16 November",
    illustration: "curl" as const,
  },
  {
    id: "stand",
    name: "Sit to stand",
    category: "Lower body",
    target: "2 sets · 6 reps",
    equipment: "A firm chair",
    description:
      "Part of your assigned lower-body routine. Keep the chair and exercise setup used in your supervised session.",
    last: "6 / 6 reps",
    next: "Review on 16 November",
    illustration: "stand" as const,
  },
  {
    id: "heel",
    name: "Supported heel raise",
    category: "Balance & mobility",
    target: "2 sets · 8 reps",
    equipment: "A stable support",
    description:
      "Your assigned standing exercise. Refer to the version practised with your care team.",
    last: "8 / 8 reps",
    next: "Review on 16 November",
    illustration: "heel" as const,
  },
];

export const groupSessions = [
  {
    id: "S08",
    date: "9 November 2026",
    time: "10:30 AM",
    name: "Morning movement",
    count: 5,
    reps: 41,
    status: "Completed",
  },
  {
    id: "S07",
    date: "6 November 2026",
    time: "10:30 AM",
    name: "Morning movement",
    count: 4,
    reps: 33,
    status: "Completed",
  },
  {
    id: "S06",
    date: "4 November 2026",
    time: "10:30 AM",
    name: "Morning movement",
    count: 5,
    reps: 37,
    status: "Completed",
  },
];
