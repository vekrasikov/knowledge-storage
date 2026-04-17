import ReactMarkdown from "react-markdown";
import type { CapacityPlanning } from "../types";

interface Props {
  capacity: CapacityPlanning | undefined;
}

export function CapacityPlanningSection({ capacity }: Props) {
  if (!capacity) {
    return <p className="text-sm italic text-gray-500">No capacity planning yet.</p>;
  }
  return (
    <div className="space-y-4 text-sm">
      {capacity.inputs.length > 0 && (
        <div>
          <h3 className="mb-1 text-base font-semibold">Inputs</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {capacity.inputs.map((i, idx) => (
              <div key={idx} className="contents">
                <dt className="font-medium">{i.name}</dt>
                <dd>
                  {i.value} <span className="text-gray-500">{i.unit}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {capacity.formulas.length > 0 && (
        <div>
          <h3 className="mb-1 text-base font-semibold">Formulas</h3>
          <ul className="space-y-1">
            {capacity.formulas.map((f, i) => (
              <li key={i}>
                <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">{f}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
      {capacity.worked_example && (
        <div>
          <h3 className="mb-1 text-base font-semibold">Worked example</h3>
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown>{capacity.worked_example}</ReactMarkdown>
          </div>
        </div>
      )}
      {capacity.numbers_to_memorize.length > 0 && (
        <div>
          <h3 className="mb-1 text-base font-semibold">Numbers to memorize</h3>
          <ul className="list-disc space-y-1 pl-5">
            {capacity.numbers_to_memorize.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
