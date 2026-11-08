import { useState } from "react";
import { Check, FlaskConical } from "lucide-react";
import { privateHeaders } from "../lib/private-api";

type EvaluationCase = { id: string; text: string; expected: "urgent" | "watch" | "routine" };
type EvaluationResult = EvaluationCase & { actual: string; mode: string; passed: boolean };

const cases: EvaluationCase[] = [
  { id: "injury", text: "Demo: la calico is limping and won't put weight on her paw near Flagler Yard.", expected: "urgent" },
  { id: "pregnancy", text: "Demo: orange tabby looks possibly pregnant, saw her by Little River Laundry.", expected: "urgent" },
  { id: "kittens", text: "Demo: escuché kittens behind the fence, maybe three, can't see them clearly.", expected: "urgent" },
  { id: "feeding", text: "Demo: all good, fed seven this morning at Little River Laundry.", expected: "routine" },
  { id: "heat", text: "Demo: it is hot and there is extreme heat at the fictional feeding spot.", expected: "watch" },
  { id: "storm", text: "Demo: flooding near the fictional colony after heavy rain.", expected: "watch" },
  { id: "feeder", text: "Demo: no feeder available for the fictional colony tonight.", expected: "urgent" },
  { id: "spanish", text: "Demo: la gata está herida y cojea, necesita ayuda.", expected: "urgent" },
];

export function AgentEvaluation() {
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  async function evaluate() {
    setRunning(true); setError(""); setResults([]);
    try {
      const next: EvaluationResult[] = [];
      for (const item of cases) {
        const response = await fetch("/api/triage", { method: "POST", headers: privateHeaders(), body: JSON.stringify({ message: item.text, source: "evaluation", urgent: false }) });
        if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) throw new Error("Sign in as a team member in Care workspace, then retry.");
        const result = await response.json() as { urgency?: string; mode?: string };
        if (!result.urgency) throw new Error("Triage did not return an urgency.");
        next.push({ ...item, actual: result.urgency, mode: result.mode ?? "unknown", passed: result.urgency === item.expected });
        setResults([...next]);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Evaluation failed."); }
    finally { setRunning(false); }
  }

  return <section className="panel agent-evaluation" aria-labelledby="agent-evaluation-title">
    <div className="panel-heading"><div><p className="eyebrow">Fictional quality checks</p><h2 id="agent-evaluation-title">Triage evaluation</h2></div><button className="secondary-button" type="button" disabled={running} onClick={() => void evaluate()}><FlaskConical size={16}/>{running ? "Running…" : "Run evaluation"}</button></div>
    <p>Eight synthetic reports compare expected urgency with the actual Worker response. Results identify agent, fallback, or demo mode; a passing result does not confirm identity or medical diagnosis.</p>
    {error && <p role="alert" className="form-notice">{error}</p>}
    {results.length > 0 && <><p><b>{results.filter((result) => result.passed).length} / {results.length} passed</b></p><div className="table-scroll"><table><thead><tr><th>Case</th><th>Expected</th><th>Actual</th><th>Mode</th><th>Result</th></tr></thead><tbody>{results.map((result) => <tr key={result.id}><td>{result.id}</td><td>{result.expected}</td><td>{result.actual}</td><td>{result.mode}</td><td>{result.passed ? <><Check size={14}/> Pass</> : "Review"}</td></tr>)}</tbody></table></div></>}
  </section>;
}
