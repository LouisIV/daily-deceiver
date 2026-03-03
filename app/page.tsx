import { numberOfQuestions } from "@/flags";
import { Game } from "./components/Game";

export default async function Page() {
  const flags = await numberOfQuestions();
  const totalQuestions = flags["num-questions"];
  
  return <Game totalQuestions={totalQuestions} />;
}
