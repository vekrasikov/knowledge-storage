import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { findNode, getAliasMap } from "../data/roadmap";
import { getTopicContent } from "../data/topicContent";
import { useUserData } from "../hooks/useUserData";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useAccordionState } from "../hooks/useAccordionState";
import { StatusToggle } from "./StatusToggle";
import { TopicAccordionSection } from "./TopicAccordionSection";
import { OverviewSection } from "./OverviewSection";
import { CheatSheetSection } from "./CheatSheetSection";
import { VisualizationSection } from "./VisualizationSection";
import { CapacityPlanningSection } from "./CapacityPlanningSection";
import type { Status } from "../types";

interface TopicPanelProps {
  topicId: string;
  directionId: string;
  onClose: () => void;
}

export function TopicPanel({ topicId, directionId: _directionId, onClose }: TopicPanelProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const {
    data,
    setProgress,
    addNote,
    updateNote,
    deleteNote,
    addMaterial,
    deleteMaterial,
  } = useUserData();

  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [matTitle, setMatTitle] = useState("");
  const [matUrl, setMatUrl] = useState("");
  const [matExcerpt, setMatExcerpt] = useState("");

  const node = findNode(topicId);
  const topicContent = getTopicContent(topicId, undefined, getAliasMap());
  const { state: accordionState, toggle: toggleAccordion } = useAccordionState(
    topicId,
    {
      overview: true,
      cheat_sheet: false,
      visualization: false,
      capacity_planning: false,
    }
  );
  if (!node) return null;

  const status: Status = data.progress[topicId] ?? "not_started";
  const notes = data.notes[topicId] ?? [];
  const materials = data.materials[topicId] ?? [];

  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    if (editingNoteId) {
      updateNote(topicId, editingNoteId, noteText);
      setEditingNoteId(null);
    } else {
      addNote(topicId, noteText);
    }
    setNoteText("");
    setShowNoteForm(false);
  };

  const handleEditNote = (id: string, text: string) => {
    setEditingNoteId(id);
    setNoteText(text);
    setShowNoteForm(true);
  };

  const handleSaveMaterial = () => {
    if (!matTitle.trim() || !matExcerpt.trim()) return;
    addMaterial(topicId, {
      title: matTitle,
      url: matUrl || undefined,
      excerpt: matExcerpt,
    });
    setMatTitle("");
    setMatUrl("");
    setMatExcerpt("");
    setShowMaterialForm(false);
  };

  const panelContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-slate-900 truncate">{node.title}</h2>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusToggle status={status} onChange={(s) => setProgress(topicId, s)} />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Summary */}
        {node.summary && (
          <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100">
            {node.summary}
          </div>
        )}

        {/* Resources */}
        {node.resources && node.resources.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Resources</h3>
            <ul className="space-y-1.5">
              {node.resources.map((res, i) => (
                <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5 flex-shrink-0">&#8250;</span>
                  <span>{res}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Project B content sections */}
        {topicContent ? (
          <section>
            <TopicAccordionSection
              title="Overview"
              expanded={accordionState.overview}
              onToggle={() => toggleAccordion("overview")}
            >
              <OverviewSection markdown={topicContent.overview} />
            </TopicAccordionSection>
            <TopicAccordionSection
              title="Cheat Sheet"
              expanded={accordionState.cheat_sheet}
              onToggle={() => toggleAccordion("cheat_sheet")}
            >
              <CheatSheetSection cheatSheet={topicContent.cheat_sheet} />
            </TopicAccordionSection>
            <TopicAccordionSection
              title="Visualization"
              expanded={accordionState.visualization}
              onToggle={() => toggleAccordion("visualization")}
            >
              <VisualizationSection visualization={topicContent.visualization} />
            </TopicAccordionSection>
            {topicContent.capacity_planning && (
              <TopicAccordionSection
                title="Capacity Planning"
                expanded={accordionState.capacity_planning}
                onToggle={() => toggleAccordion("capacity_planning")}
              >
                <CapacityPlanningSection capacity={topicContent.capacity_planning} />
              </TopicAccordionSection>
            )}
          </section>
        ) : null}

        {/* Notes Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-slate-800">Notes</h3>
            <button
              onClick={() => {
                setShowNoteForm(true);
                setEditingNoteId(null);
                setNoteText("");
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              Add Note
            </button>
          </div>

          {showNoteForm && (
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write your note..."
                className="w-full p-2 border border-slate-200 rounded-lg mb-2 min-h-[100px] resize-y text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNote}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowNoteForm(false);
                    setEditingNoteId(null);
                    setNoteText("");
                  }}
                  className="px-3 py-1.5 bg-slate-200 rounded-lg text-sm hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {notes.length === 0 && !showNoteForm && (
            <p className="text-slate-400 italic text-sm">No notes yet</p>
          )}

          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="p-3 bg-white border border-slate-200 rounded-lg">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{note.text}</ReactMarkdown>
                </div>
                <div className="flex gap-2 mt-2 text-xs text-slate-400">
                  <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                  <button
                    onClick={() => handleEditNote(note.id, note.text)}
                    className="text-blue-500 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteNote(topicId, note.id)}
                    className="text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Materials Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-slate-800">Materials</h3>
            <button
              onClick={() => setShowMaterialForm(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              Add Material
            </button>
          </div>

          {showMaterialForm && (
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <input
                value={matTitle}
                onChange={(e) => setMatTitle(e.target.value)}
                placeholder="Title"
                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
              />
              <input
                value={matUrl}
                onChange={(e) => setMatUrl(e.target.value)}
                placeholder="URL (optional)"
                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
              />
              <textarea
                value={matExcerpt}
                onChange={(e) => setMatExcerpt(e.target.value)}
                placeholder="Key takeaway / excerpt"
                className="w-full p-2 border border-slate-200 rounded-lg min-h-[80px] resize-y text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveMaterial}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowMaterialForm(false)}
                  className="px-3 py-1.5 bg-slate-200 rounded-lg text-sm hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {materials.length === 0 && !showMaterialForm && (
            <p className="text-slate-400 italic text-sm">No materials yet</p>
          )}

          <div className="space-y-3">
            {materials.map((mat) => (
              <div key={mat.id} className="p-3 bg-white border border-slate-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-sm text-slate-800">{mat.title}</h4>
                    {mat.url && (
                      <a
                        href={mat.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline"
                      >
                        {mat.url}
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => deleteMaterial(topicId, mat.id)}
                    className="text-xs text-red-500 hover:underline flex-shrink-0 ml-2"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-sm text-slate-600 mt-1">{mat.excerpt}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="panel-backdrop fixed inset-0 z-40"
        onClick={onClose}
      />

      {isDesktop ? (
        /* Desktop: right side panel */
        <div
          className="panel-slide-right fixed top-0 right-0 h-full w-[420px] bg-white shadow-xl z-50 flex flex-col"
          style={{ transform: "translateX(0)" }}
        >
          {panelContent}
        </div>
      ) : (
        /* Mobile: bottom sheet */
        <div
          className="panel-slide-up fixed bottom-0 left-0 right-0 bg-white shadow-xl z-50 rounded-t-xl flex flex-col"
          style={{ maxHeight: "85vh", transform: "translateY(0)" }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 bg-slate-300 rounded-full" />
          </div>
          {panelContent}
        </div>
      )}
    </>
  );
}
