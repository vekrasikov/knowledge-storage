import ReactMarkdown from "react-markdown";
import type { CheatSheet } from "../types";

interface Props {
  cheatSheet: CheatSheet | undefined;
}

function BulletList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mt-4 mb-1 text-base font-semibold">{title}</h3>
      <ul className="list-disc space-y-1 pl-5">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

export function CheatSheetSection({ cheatSheet }: Props) {
  if (!cheatSheet) {
    return <p className="text-sm italic text-gray-500">No cheat sheet yet.</p>;
  }
  const { key_facts, commands, trade_offs, pitfalls, interview_questions, extras_markdown } =
    cheatSheet;

  return (
    <div className="space-y-2 text-sm">
      {key_facts && key_facts.length > 0 && <BulletList title="Key facts" items={key_facts} />}
      {commands && commands.length > 0 && (
        <div>
          <h3 className="mt-4 mb-1 text-base font-semibold">Commands</h3>
          <ul className="list-disc space-y-1 pl-5">
            {commands.map((c, i) => (
              <li key={i}>
                <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">{c}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
      {trade_offs && trade_offs.rows.length > 0 && (
        <div>
          <h3 className="mt-4 mb-1 text-base font-semibold">Trade-offs</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-gray-300 dark:border-gray-600">
                <tr>
                  {trade_offs.headers.map((h, i) => (
                    <th key={i} className="px-2 py-1 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trade_offs.rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-gray-200 dark:border-gray-700">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-2 py-1">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {pitfalls && pitfalls.length > 0 && <BulletList title="Pitfalls" items={pitfalls} />}
      {interview_questions && interview_questions.length > 0 && (
        <BulletList title="Interview questions" items={interview_questions} />
      )}
      {extras_markdown && (
        <div className="prose dark:prose-invert mt-4 max-w-none">
          <ReactMarkdown>{extras_markdown}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
