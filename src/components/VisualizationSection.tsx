import type { Visualization } from "../types";
import { MermaidDiagram } from "./MermaidDiagram";

interface Props {
  visualization: Visualization | undefined;
}

export function VisualizationSection({ visualization }: Props) {
  if (!visualization) {
    return <p className="text-sm italic text-gray-500">No visualization yet.</p>;
  }
  if (visualization.type === "mermaid") {
    return <MermaidDiagram content={visualization.content ?? ""} alt={visualization.alt} />;
  }
  return (
    <img
      src={visualization.src}
      alt={visualization.alt}
      className="max-w-full rounded border border-gray-200 dark:border-gray-700"
    />
  );
}
