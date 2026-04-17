import { useEffect, useId, useRef, useState } from "react";

interface Props {
  content: string;
  alt: string;
}

export function MermaidDiagram({ content, alt }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const diagramId = "mermaid-" + reactId.replace(/:/g, "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "default" });
        const { svg } = await mermaid.render(diagramId, content);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [content, diagramId]);

  if (error) {
    return (
      <div
        role="alert"
        className="rounded border border-red-400 bg-red-50 p-3 text-sm text-red-700"
      >
        Failed to render diagram: {error}
      </div>
    );
  }
  return <div ref={containerRef} aria-label={alt} role="img" />;
}
