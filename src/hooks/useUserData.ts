import { useState, useCallback } from "react";
import type { UserData, Status } from "../types";
import {
  loadUserData,
  saveUserData,
  setProgress as setProgressFn,
  addNote as addNoteFn,
  updateNote as updateNoteFn,
  deleteNote as deleteNoteFn,
  addMaterial as addMaterialFn,
  deleteMaterial as deleteMaterialFn,
  exportData,
  importData,
} from "../utils/storage";

export function useUserData() {
  const [data, setData] = useState<UserData>(loadUserData);

  const update = useCallback((fn: (prev: UserData) => UserData) => {
    setData((prev) => {
      const next = fn(prev);
      saveUserData(next);
      return next;
    });
  }, []);

  const setProgress = useCallback(
    (topicId: string, status: Status) => {
      update((prev) => setProgressFn(prev, topicId, status));
    },
    [update]
  );

  const addNote = useCallback(
    (topicId: string, text: string) => {
      update((prev) => addNoteFn(prev, topicId, text));
    },
    [update]
  );

  const updateNote = useCallback(
    (topicId: string, noteId: string, text: string) => {
      update((prev) => updateNoteFn(prev, topicId, noteId, text));
    },
    [update]
  );

  const deleteNote = useCallback(
    (topicId: string, noteId: string) => {
      update((prev) => deleteNoteFn(prev, topicId, noteId));
    },
    [update]
  );

  const addMaterial = useCallback(
    (
      topicId: string,
      input: { title: string; url?: string; excerpt: string }
    ) => {
      update((prev) => addMaterialFn(prev, topicId, input));
    },
    [update]
  );

  const deleteMaterial = useCallback(
    (topicId: string, materialId: string) => {
      update((prev) => deleteMaterialFn(prev, topicId, materialId));
    },
    [update]
  );

  const handleExport = useCallback(() => {
    const json = exportData(data);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `knowledge-storage-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const handleImport = useCallback(
    (json: string) => {
      const imported = importData(json);
      update(() => imported);
    },
    [update]
  );

  const replaceData = useCallback(
    (newData: UserData) => {
      update(() => newData);
    },
    [update]
  );

  return {
    data,
    replaceData,
    setProgress,
    addNote,
    updateNote,
    deleteNote,
    addMaterial,
    deleteMaterial,
    handleExport,
    handleImport,
  };
}
