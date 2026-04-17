import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { findNode, getAliasMap } from "../data/roadmap";
import { getTopicContent } from "../data/topicContent";
import { useUserData } from "../hooks/useUserData";
import { useAccordionState } from "../hooks/useAccordionState";
import { StatusToggle } from "../components/StatusToggle";
import { TopicAccordionSection } from "../components/TopicAccordionSection";
import { OverviewSection } from "../components/OverviewSection";
import { CheatSheetSection } from "../components/CheatSheetSection";
import { VisualizationSection } from "../components/VisualizationSection";
import { CapacityPlanningSection } from "../components/CapacityPlanningSection";
import type { Status } from "../types";

export function TopicDetail() {
  const { directionId, topicId } = useParams<{
    directionId: string;
    topicId: string;
  }>();
  const navigate = useNavigate();
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

  const node = findNode(topicId!);
  const topicContent = getTopicContent(topicId!, undefined, getAliasMap());
  const { state: accordionState, toggle: toggleAccordion } = useAccordionState(
    topicId ?? "unknown",
    {
      overview: true,
      cheat_sheet: false,
      visualization: false,
      capacity_planning: false,
    }
  );
  if (!node) return <div className="p-4">Topic not found</div>;

  const status: Status = data.progress[topicId!] ?? "not_started";
  const notes = data.notes[topicId!] ?? [];
  const materials = data.materials[topicId!] ?? [];

  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    if (editingNoteId) {
      updateNote(topicId!, editingNoteId, noteText);
      setEditingNoteId(null);
    } else {
      addNote(topicId!, noteText);
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
    addMaterial(topicId!, {
      title: matTitle,
      url: matUrl || undefined,
      excerpt: matExcerpt,
    });
    setMatTitle("");
    setMatUrl("");
    setMatExcerpt("");
    setShowMaterialForm(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <button
        onClick={() => navigate(`/roadmap/${directionId}`)}
        className="text-blue-600 hover:underline mb-4 block"
      >
        ← Back
      </button>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">{node.title}</h1>
        <StatusToggle status={status} onChange={(s) => setProgress(topicId!, s)} />
      </div>

      {/* Project B content sections */}
      {topicContent ? (
        <div className="mb-8">
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
        </div>
      ) : (
        <p className="my-4 text-sm italic text-gray-500">No extended content yet.</p>
      )}

      {/* Notes Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Notes</h2>
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
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write your note..."
              className="w-full p-2 border rounded-lg mb-2 min-h-[100px] resize-y"
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
                className="px-3 py-1.5 bg-gray-200 rounded-lg text-sm hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {notes.length === 0 && !showNoteForm && (
          <p className="text-gray-400 italic text-sm">No notes yet</p>
        )}

        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="p-3 bg-white border rounded-lg">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{note.text}</ReactMarkdown>
              </div>
              <div className="flex gap-2 mt-2 text-xs text-gray-400">
                <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                <button
                  onClick={() => handleEditNote(note.id, note.text)}
                  className="text-blue-500 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteNote(topicId!, note.id)}
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
          <h2 className="text-lg font-semibold">Materials</h2>
          <button
            onClick={() => setShowMaterialForm(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            Add Material
          </button>
        </div>

        {showMaterialForm && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border space-y-2">
            <input
              value={matTitle}
              onChange={(e) => setMatTitle(e.target.value)}
              placeholder="Title"
              className="w-full p-2 border rounded-lg"
            />
            <input
              value={matUrl}
              onChange={(e) => setMatUrl(e.target.value)}
              placeholder="URL (optional)"
              className="w-full p-2 border rounded-lg"
            />
            <textarea
              value={matExcerpt}
              onChange={(e) => setMatExcerpt(e.target.value)}
              placeholder="Key takeaway / excerpt"
              className="w-full p-2 border rounded-lg min-h-[80px] resize-y"
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
                className="px-3 py-1.5 bg-gray-200 rounded-lg text-sm hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {materials.length === 0 && !showMaterialForm && (
          <p className="text-gray-400 italic text-sm">No materials yet</p>
        )}

        <div className="space-y-3">
          {materials.map((mat) => (
            <div key={mat.id} className="p-3 bg-white border rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{mat.title}</h3>
                  {mat.url && (
                    <a
                      href={mat.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline"
                    >
                      {mat.url}
                    </a>
                  )}
                </div>
                <button
                  onClick={() => deleteMaterial(topicId!, mat.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">{mat.excerpt}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
