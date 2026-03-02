import React from "react";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../../supabase";
import { useAuth } from "./AuthContext";
import { Module, createNewModule } from "../data/mock-data";

interface ModulesContextType {
  modules: Module[];
  loading: boolean;
  addModule: (name: string, subtitle: string, tags: string[]) => void;
  deleteModule: (id: string) => void;
}

const ModulesContext = createContext<ModulesContextType>({
  modules: [],
  loading: true,
  addModule: () => {},
  deleteModule: () => {},
});

export function useModules() {
  return useContext(ModulesContext);
}

export function ModulesProvider({ children }: { children: ReactNode }) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

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
        createNewModule(row.name, row.subtitle || "", row.tags || [], row.id)
      );

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
    const newMod = createNewModule(name, subtitle, tags, data.id);
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

  return (
    <ModulesContext.Provider value={{ modules, loading, addModule, deleteModule }}>
      {children}
    </ModulesContext.Provider>
  );
}