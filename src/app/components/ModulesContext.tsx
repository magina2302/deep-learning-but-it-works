import React from "react";
import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "../../supabase";
import { useAuth } from "./AuthContext";
import { ChatAttachment, Module, createInactiveReminderModule, createMockModuleWithHistory, createNewModule } from "../data/mock-data";
import {
  DiagnosticProfile,
  ReviewOutcome,
  buildDiagnosticProfile,
  buildModuleFromDiagnostic,
  enrichModuleWithEvidence,
  mergeExtractedSubtopics,
  recordReviewOutcome as recordEvidenceReviewOutcome,
  summarizeAttachmentForSubtopics,
} from "../data/learning-core";

interface AddModulePayload {
  name: string;
  subtitle: string;
  tags: string[];
  goal: string;
  deadline?: string;
  weeklyStudyMinutes: number;
  baselineConfidence: number;
  knownWeakAreas: string[];
  constraints?: string;
  initialSubtopics: string[];
}

interface ModulesContextType {
  modules: Module[];
  loading: boolean;
  addModule: (payload: AddModulePayload) => void;
  deleteModule: (id: string) => void;
  updateModuleProgress: (id: string, changes: { lastStudied?: Date }) => void;
  ingestStudyMaterials: (id: string, attachments: ChatAttachment[], extractedSubtopics?: Record<string, string[]>) => void;
  recordReviewOutcome: (moduleId: string, subtopicId: string, outcome: ReviewOutcome, note: string) => void;
  updateModuleDiagnostic: (moduleId: string, diagnostic: DiagnosticProfile) => void;
}

const ModulesContext = createContext<ModulesContextType>({
  modules: [],
  loading: true,
  addModule: () => {},
  deleteModule: () => {},
  updateModuleProgress: () => {},
  ingestStudyMaterials: () => {},
  recordReviewOutcome: () => {},
  updateModuleDiagnostic: () => {},
});

type PersistedChatMessage = {
  id: string;
  role: "ai" | "student";
  content: string;
  timestamp: string;
  attachments?: ChatAttachment[];
  meta?: Module["chatHistory"][number]["meta"];
};

type PersistedModule = Omit<Module, "lastStudied" | "chatHistory"> & {
  lastStudied: string;
  chatHistory: PersistedChatMessage[];
};

export function useModules() {
  return useContext(ModulesContext);
}

function getTopicRowId(row: any): string | undefined {
  return row?.module_id ?? row?.id;
}

function serializeModule(module: Module): PersistedModule {
  return {
    ...module,
    lastStudied: module.lastStudied.toISOString(),
    chatHistory: module.chatHistory.map((message) => ({
      ...message,
      timestamp: message.timestamp.toISOString(),
    })),
  };
}

function deserializeModule(module: PersistedModule | Module): Module {
  return {
    ...module,
    lastStudied: module.lastStudied instanceof Date ? module.lastStudied : new Date(module.lastStudied),
    chatHistory: module.chatHistory.map((message) => ({
      ...message,
      timestamp: message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp),
    })),
  };
}

function safeParseModuleState(raw: string | null): Record<string, PersistedModule> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, PersistedModule>;
  } catch {
    return {};
  }
}

function mergePersistedModule(baseModule: Module, persisted: PersistedModule | undefined): Module {
  if (!persisted) return enrichModuleWithEvidence(baseModule);

  const persistedModule = deserializeModule(persisted);
  return enrichModuleWithEvidence({
    ...baseModule,
    ...persistedModule,
    id: baseModule.id,
    name: persistedModule.name || baseModule.name,
    subtitle: persistedModule.subtitle || baseModule.subtitle,
    tags: persistedModule.tags?.length ? persistedModule.tags : baseModule.tags,
  });
}

function toDiagnostic(payload: AddModulePayload): DiagnosticProfile {
  return buildDiagnosticProfile({
    goal: payload.goal,
    deadline: payload.deadline,
    weeklyStudyMinutes: payload.weeklyStudyMinutes,
    baselineConfidence: payload.baselineConfidence,
    knownWeakAreas: payload.knownWeakAreas,
    constraints: payload.constraints,
  });
}

export function ModulesProvider({ children }: { children: ReactNode }) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const moduleStateStorageKey = useMemo(() => `module-state:${user?.id ?? "guest"}`, [user?.id]);

  const persistModules = (items: Module[]) => {
    try {
      const snapshot: Record<string, PersistedModule> = {};
      items.forEach((moduleItem) => {
        snapshot[moduleItem.id] = serializeModule(moduleItem);
      });
      localStorage.setItem(moduleStateStorageKey, JSON.stringify(snapshot));
    } catch {
    }
  };

  useEffect(() => {
    if (!user) {
      setModules([]);
      setLoading(false);
      return;
    }

    const fetchModules = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.log("Error fetching modules:", error.message);
        setLoading(false);
        return;
      }

      const loaded: Module[] = (data || []).map((row: any) => createNewModule(row.name, row.subtitle || "", row.tags || [], getTopicRowId(row)));
      const merged = [...loaded];
      for (const mockModule of [createMockModuleWithHistory(), createInactiveReminderModule()]) {
        if (!merged.some((moduleItem) => moduleItem.id === mockModule.id)) {
          merged.unshift(mockModule);
        }
      }

      const persisted = safeParseModuleState(localStorage.getItem(moduleStateStorageKey));
      const hydrated = merged.map((moduleItem) => mergePersistedModule(moduleItem, persisted[moduleItem.id]));
      setModules(hydrated);
      persistModules(hydrated);
      setLoading(false);
    };

    void fetchModules();
  }, [moduleStateStorageKey, user]);

  const updateModules = (updater: (previous: Module[]) => Module[]) => {
    setModules((previous) => {
      const next = updater(previous).map((moduleItem) => enrichModuleWithEvidence(moduleItem));
      persistModules(next);
      return next;
    });
  };

  const addModule = async (payload: AddModulePayload) => {
    if (!user) return;

    const newModuleId = crypto.randomUUID();
    const basePayload = {
      module_id: newModuleId,
      student_id: user.id,
      name: payload.name,
      subtitle: payload.subtitle,
      tags: payload.tags,
    };

    const { data, error } = await supabase.from("topics").insert(basePayload).select().single();
    if (error) {
      console.log("Error adding module:", error.message);
      return;
    }

    const baseModule = createNewModule(payload.name, payload.subtitle, payload.tags, getTopicRowId(data));
    const configured = buildModuleFromDiagnostic(baseModule, toDiagnostic(payload), payload.initialSubtopics);
    updateModules((previous) => [...previous, configured]);
  };

  const deleteModule = async (id: string) => {
    if (!user) return;

    if (id === "mock-module-chat-history" || id === "mock-module-inactive-5-days") {
      updateModules((previous) => previous.filter((moduleItem) => moduleItem.id !== id));
      return;
    }

    let { error, count } = await supabase
      .from("topics")
      .delete({ count: "exact" })
      .eq("module_id", id)
      .eq("student_id", user.id)
      .select("module_id");

    if ((!error && (count ?? 0) === 0) || (error && /column .*module_id|module_id does not exist|module_id/i.test(error.message))) {
      ({ error } = await supabase.from("topics").delete().eq("id", id).eq("student_id", user.id));
    }

    if (error) {
      console.log("Error deleting module:", error.message);
      return;
    }

    updateModules((previous) => previous.filter((moduleItem) => moduleItem.id !== id));
  };

  const updateModuleProgress = (id: string, changes: { lastStudied?: Date }) => {
    updateModules((previous) => previous.map((moduleItem) => {
      if (moduleItem.id !== id) return moduleItem;
      return {
        ...moduleItem,
        lastStudied: changes.lastStudied ?? moduleItem.lastStudied,
      };
    }));
  };

  const ingestStudyMaterials = (id: string, attachments: ChatAttachment[], extractedSubtopics?: Record<string, string[]>) => {
    updateModules((previous) => previous.map((moduleItem) => {
      if (moduleItem.id !== id) return moduleItem;

      let nextModule = { ...moduleItem };
      for (const attachment of attachments) {
        const candidates = extractedSubtopics?.[attachment.id] || summarizeAttachmentForSubtopics(attachment, moduleItem.name);
        nextModule = {
          ...nextModule,
          subtopics: mergeExtractedSubtopics(nextModule.subtopics, candidates, attachment.name),
          learningSummary: [
            `Parsed ${attachment.name} and generated ${Math.min(candidates.length, 5)} evidence-backed subtopic candidates.`,
            ...nextModule.learningSummary,
          ].slice(0, 6),
        };
      }

      return nextModule;
    }));
  };

  const recordReviewOutcome = (moduleId: string, subtopicId: string, outcome: ReviewOutcome, note: string) => {
    updateModules((previous) => previous.map((moduleItem) => {
      if (moduleItem.id !== moduleId) return moduleItem;
      const updated = recordEvidenceReviewOutcome(moduleItem, subtopicId, outcome, note);
      const dateKey = new Date().toISOString().slice(0, 10);
      const completedReviewDates = new Set(updated.accountability?.completedReviewDates || []);
      completedReviewDates.add(dateKey);
      return {
        ...updated,
        accountability: {
          streakDays: completedReviewDates.size,
          completedReviewDates: [...completedReviewDates].sort(),
          lastNudgeAt: updated.accountability?.lastNudgeAt,
        },
      };
    }));
  };

  const updateModuleDiagnostic = (moduleId: string, diagnostic: DiagnosticProfile) => {
    updateModules((previous) => previous.map((moduleItem) => {
      if (moduleItem.id !== moduleId) return moduleItem;
      return {
        ...moduleItem,
        diagnostic,
      };
    }));
  };

  return (
    <ModulesContext.Provider
      value={{
        modules,
        loading,
        addModule,
        deleteModule,
        updateModuleProgress,
        ingestStudyMaterials,
        recordReviewOutcome,
        updateModuleDiagnostic,
      }}
    >
      {children}
    </ModulesContext.Provider>
  );
}
