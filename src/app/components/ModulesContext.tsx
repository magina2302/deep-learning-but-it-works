import React from "react";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../../supabase";
import { useAuth } from "./AuthContext";
import { Module, Subtopic, createNewModule } from "../data/mock-data";
import { computeNextStreak, computeOverallMastery, computeStatus, getWeakSpots } from "../data/metrics";

interface ModulesContextType {
  modules: Module[];
  loading: boolean;
  addModule: (name: string, subtitle: string, tags: string[]) => Promise<void>;
  deleteModule: (id: string) => Promise<void>;
  recordStudySession: (id: string) => Promise<void>;
}

const ModulesContext = createContext<ModulesContextType>({
  modules: [],
  loading: true,
  addModule: async () => {},
  deleteModule: async () => {},
  recordStudySession: async () => {},
});

export function useModules() {
  return useContext(ModulesContext);
}

export function ModulesProvider({ children }: { children: ReactNode }) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const parseDate = (value: unknown): Date | null => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const parseTags = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.filter((tag): tag is string => typeof tag === "string");
    return [];
  };

  const mapSubtopic = (row: any): Subtopic => ({
    id: String(row.id),
    name: row.name || "Untitled Subtopic",
    mastery: Number(row.mastery ?? row.mastery_score ?? 0),
    mistakeCount: Number(row.mistake_count ?? row.mistakeCount ?? 0),
    attempts: Number(row.attempts ?? 0),
    completed: Boolean(row.completed ?? false),
    forgettingRisk: row.forgetting_risk === "high" || row.forgetting_risk === "medium" ? row.forgetting_risk : "low",
  });

  const toModule = (row: any, subtopics: Subtopic[]): Module => {
    const fallback = createNewModule(row.name || "Untitled Module", row.subtitle || "", parseTags(row.tags), row.id);
    const lastStudied =
      parseDate(row.last_studied_at) ||
      parseDate(row.lastStudied) ||
      parseDate(row.updated_at) ||
      parseDate(row.created_at) ||
      new Date();
    const streak = Number(row.streak ?? 0);
    const persistedMastery = Number(row.overall_mastery ?? row.overallMastery ?? 0);
    const overallMastery = computeOverallMastery(subtopics, persistedMastery);
    const { status, statusLabel } = computeStatus(lastStudied, overallMastery, getWeakSpots(subtopics));

    return {
      ...fallback,
      name: row.name || fallback.name,
      subtitle: row.subtitle || "",
      tags: parseTags(row.tags),
      lastStudied,
      streak,
      overallMastery,
      status,
      statusLabel,
      todaysFocus: row.todays_focus || row.todaysFocus || fallback.todaysFocus,
      subtopics,
    };
  };

  // Load modules from Supabase when user logs in
  useEffect(() => {
    if (!user) {
      setModules([]);
      setLoading(false);
      return;
    }

    const fetchModules = async () => {
      setLoading(true);
      const { data: topicsData, error } = await supabase
        .from("topics")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.log("Error fetching modules:", error.message);
        setLoading(false);
        return;
      }

      const topicRows = topicsData || [];
      const topicIds = topicRows.map((row: any) => row.id);
      let subtopicsByTopic: Record<string, Subtopic[]> = {};

      if (topicIds.length > 0) {
        const { data: subtopicData, error: subtopicsError } = await supabase
          .from("subtopics")
          .select("*")
          .in("topic_id", topicIds);

        if (subtopicsError) {
          console.log("Error fetching subtopics:", subtopicsError.message);
        } else {
          subtopicsByTopic = (subtopicData || []).reduce((acc: Record<string, Subtopic[]>, row: any) => {
            const topicId = String(row.topic_id);
            if (!acc[topicId]) acc[topicId] = [];
            acc[topicId].push(mapSubtopic(row));
            return acc;
          }, {});
        }
      }

      const loaded: Module[] = topicRows.map((row: any) => toModule(row, subtopicsByTopic[String(row.id)] || []));

      setModules(loaded);
      setLoading(false);
    };

    fetchModules();
  }, [user]);

  const addModule = async (name: string, subtitle: string, tags: string[]) => {
    if (!user) return;

    // Save to Supabase first
    const { data, error } = await supabase
      .from("topics")
      .insert({
        student_id: user.id,
        name,
        subtitle,
        tags,
      })
      .select()
      .single();

    if (error) {
      console.log("Error adding module:", error.message);
      return;
    }

    // Add to local state with the real ID from Supabase
    const newMod = toModule(data, []);
    setModules((prev) => [...prev, newMod]);
  };

  const deleteModule = async (id: string) => {
    if (!user) return;

    // Delete from Supabase
    const { error } = await supabase
      .from("topics")
      .delete()
      .eq("id", id)
      .eq("student_id", user.id);

    if (error) {
      console.log("Error deleting module:", error.message);
      return;
    }

    // Remove from local state
    setModules((prev) => prev.filter((m) => m.id !== id));
  };

  const recordStudySession = async (id: string) => {
    if (!user) return;

    const currentModule = modules.find((m) => m.id === id);
    if (!currentModule) return;

    const now = new Date();
    const streak = computeNextStreak(currentModule.lastStudied, currentModule.streak, now);
    const overallMastery = computeOverallMastery(currentModule.subtopics, currentModule.overallMastery);
    const { status, statusLabel } = computeStatus(now, overallMastery, getWeakSpots(currentModule.subtopics));

    const { error } = await supabase
      .from("topics")
      .update({
        last_studied_at: now.toISOString(),
        streak,
        overall_mastery: overallMastery,
        status,
        status_label: statusLabel,
      })
      .eq("id", id)
      .eq("student_id", user.id);

    if (error) {
      console.log("Error updating study session:", error.message);
      return;
    }

    setModules((prev) =>
      prev.map((mod) =>
        mod.id === id
          ? {
              ...mod,
              lastStudied: now,
              streak,
              overallMastery,
              status,
              statusLabel,
            }
          : mod,
      ),
    );
  };

  return (
    <ModulesContext.Provider value={{ modules, loading, addModule, deleteModule, recordStudySession }}>
      {children}
    </ModulesContext.Provider>
  );
}
