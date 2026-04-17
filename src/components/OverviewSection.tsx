import ReactMarkdown from "react-markdown";

interface Props {
  markdown: string | undefined;
}

export function OverviewSection({ markdown }: Props) {
  if (!markdown) {
    return <p className="text-sm italic text-gray-500">No overview yet.</p>;
  }
  return (
    <div className="prose dark:prose-invert max-w-none">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}
