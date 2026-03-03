export type Grade = {
  minPercent: number;
  title: string;
  sub: string;
};

/** Ordered highest-threshold first. Percentages represent minimum correct answers required. */
export const GRADES: Grade[] = [
  { minPercent: 90, title: "EDITOR-IN-CHIEF", sub: "You could smell the ink from a mile away." },
  { minPercent: 70, title: "SEASONED CORRESPONDENT", sub: "A discerning reader of considerable merit." },
  { minPercent: 50, title: "CASUAL SUBSCRIBER", sub: "You got your nickel's worth, at least." },
  { minPercent: 30, title: "OCCASIONAL READER", sub: "Perhaps stick to the weather column." },
  { minPercent: 0, title: "HOPELESSLY DECEIVED", sub: "We suggest canceling your subscription." },
];

export function getGrade(score: number, total: number): [string, string] {
  const percentage = total > 0 ? (score / total) * 100 : 0;
  const grade = GRADES.find((g) => percentage >= g.minPercent) ?? GRADES[GRADES.length - 1];
  return [grade.title, grade.sub];
}
