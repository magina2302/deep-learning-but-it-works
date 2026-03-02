import React from "react";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../../supabase";
import { useAuth } from "./AuthContext";
import { Module, createNewModule, createMockModuleWithHistory, createInactiveReminderModule } from "../data/mock-data";

interface ModulesContextType {
  modules: Module[];
  loading: boolean;
  addModule: (name: string, subtitle: string, tags: string[]) => void;
  deleteModule: (id: string) => void;
  updateModuleProgress: (id: string, changes: { overallMastery?: number; lastStudied?: Date }) => void;
}

const ModulesContext = createContext<ModulesContextType>({
  modules: [],
  loading: true,
  addModule: () => {},
  deleteModule: () => {},
  updateModuleProgress: () => {},
});

export function useModules() {
  return useContext(ModulesContext);
}

export function ModulesProvider({ children }: { children: ReactNode }) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const getTopicRowId = (row: any): string | undefined => row?.module_id ?? row?.id;
  const progressStorageKey = `module-progress:${user?.id ?? "guest"}`;

  const getStatusFromMastery = (mastery: number): Pick<Module, "status" | "statusLabel"> => {
    if (mastery >= 75) {
      return { status: "on-track", statusLabel: "Strong momentum" };
    }
    if (mastery >= 40) {
      return { status: "needs-review", statusLabel: "Building understanding" };
    }
    return { status: "inactive", statusLabel: "Needs reinforcement" };
  };

  const applyStoredProgress = (items: Module[]): Module[] => {
    try {
      const raw = localStorage.getItem(progressStorageKey);
      if (!raw) return items;

      const progress = JSON.parse(raw) as Record<string, { overallMastery?: number; lastStudied?: string }>;
      return items.map((moduleItem) => {
        const saved = progress[moduleItem.id];
        if (!saved) return moduleItem;

        const mastery = typeof saved.overallMastery === "number"
          ? Math.max(0, Math.min(100, Math.round(saved.overallMastery)))
          : moduleItem.overallMastery;

        const lastStudied = saved.lastStudied ? new Date(saved.lastStudied) : moduleItem.lastStudied;
        const safeLastStudied = Number.isNaN(lastStudied.getTime()) ? moduleItem.lastStudied : lastStudied;

        return {
          ...moduleItem,
          overallMastery: mastery,
          lastStudied: safeLastStudied,
          ...getStatusFromMastery(mastery),
        };
      });
    } catch {
      return items;
    }
  };

  const persistProgressForModules = (items: Module[]) => {
    try {
      const progress: Record<string, { overallMastery: number; lastStudied: string }> = {};
      items.forEach((moduleItem) => {
        progress[moduleItem.id] = {
          overallMastery: moduleItem.overallMastery,
          lastStudied: moduleItem.lastStudied.toISOString(),
        };
      });
      localStorage.setItem(progressStorageKey, JSON.stringify(progress));
    } catch {
    }
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

      // Convert Supabase rows to Module format
      const loaded: Module[] = (data || []).map((row: any) =>
        createNewModule(row.name, row.subtitle || "", row.tags || [], getTopicRowId(row))
      );

      const mockModules = [createMockModuleWithHistory(), createInactiveReminderModule()];
      const merged = [...loaded];
      mockModules.forEach((mockModule) => {
        if (!merged.some((moduleItem) => moduleItem.id === mockModule.id)) {
          merged.unshift(mockModule);
        }
      });

      const hydrated = applyStoredProgress(merged);

      setModules(hydrated);
      persistProgressForModules(hydrated);
      setLoading(false);
    };

    fetchModules();
  }, [user]);

  const addModule = async (name: string, subtitle: string, tags: string[]) => {
    if (!user) return;

    const newModuleId = crypto.randomUUID();

    const basePayload = {
      module_id: newModuleId,
      student_id: user.id,
      name,
      subtitle,
      tags,
    };

    // Save to Supabase first
    const { data, error } = await supabase
      .from("topics")
      .insert(basePayload)
      .select()
      .single();

    if (error) {
      console.log("Error adding module:", error.message);
      return;
    }

    // Add to local state with the real ID from Supabase
    const newMod = createNewModule(name, subtitle, tags, getTopicRowId(data));
    setModules((prev) => [...prev, newMod]);
  };

  const deleteModule = async (id: string) => {
    if (!user) return;

    if (id === "mock-module-chat-history" || id === "mock-module-inactive-5-days") {
      setModules((prev) => {
        const next = prev.filter((m) => m.id !== id);
        persistProgressForModules(next);
        return next;
      });
      return;
    }

    // Delete from Supabase (module_id first as canonical)
    let { error, count } = await supabase
      .from("topics")
      .delete({ count: "exact" })
      .eq("module_id", id)
      .eq("student_id", user.id)
      .select("module_id");

    // Compatibility fallback for schemas where id is canonical
    if ((!error && (count ?? 0) === 0) || (error && /column .*module_id|module_id does not exist|module_id/i.test(error.message))) {
      ({ error } = await supabase
        .from("topics")
        .delete()
        .eq("id", id)
        .eq("student_id", user.id));
    }

    if (error) {
      console.log("Error deleting module:", error.message);
      return;
    }

    // Remove from local state
    setModules((prev) => {
      const next = prev.filter((m) => m.id !== id);
      persistProgressForModules(next);
      return next;
    });
  };

  const updateModuleProgress = (id: string, changes: { overallMastery?: number; lastStudied?: Date }) => {
    setModules((prev) => {
      const next = prev.map((moduleItem) => {
        if (moduleItem.id !== id) return moduleItem;

        const mastery = typeof changes.overallMastery === "number"
          ? Math.max(0, Math.min(100, Math.round(changes.overallMastery)))
          : moduleItem.overallMastery;

        const lastStudied = changes.lastStudied ?? moduleItem.lastStudied;

        return {
          ...moduleItem,
          overallMastery: mastery,
          lastStudied,
          ...getStatusFromMastery(mastery),
        };
      });

      persistProgressForModules(next);
      return next;
    });
  };

  return (
    <ModulesContext.Provider value={{ modules, loading, addModule, deleteModule, updateModuleProgress }}>
      {children}
    </ModulesContext.Provider>
  );
}