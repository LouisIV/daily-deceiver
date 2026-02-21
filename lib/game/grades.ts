export type Grade = {
  minScore: number;
  title: string;
  sub: string;
};

/** Ordered highest-threshold first. */
export const GRADES: Grade[] = [
  { minScore: 9, title: "EDITOR-IN-CHIEF", sub: "You could smell the ink from a mile away." },
  { minScore: 7, title: "SEASONED CORRESPONDENT", sub: "A discerning reader of considerable merit." },
  { minScore: 5, title: "CASUAL SUBSCRIBER", sub: "You got your nickel's worth, at least." },
  { minScore: 3, title: "OCCASIONAL READER", sub: "Perhaps stick to the weather column." },
  { minScore: 0, title: "HOPELESSLY DECEIVED", sub: "We suggest canceling your subscription." },
];

export function getGrade(score: number): [string, string] {
  const grade = GRADES.find((g) => score >= g.minScore) ?? GRADES[GRADES.length - 1];
  return [grade.title, grade.sub];
}
