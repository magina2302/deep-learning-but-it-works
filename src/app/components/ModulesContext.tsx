import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../../supabase";
import { useAuth } from "./AuthContext";
import { AiMessageMeta, ChatAttachment, ChatMessage, Module, createInactiveReminderModule, createMockModuleWithHistory, createNewModule } from "../data/mock-data";
import {
  CitationRef,
  DiagnosticProfile,
  ReviewOutcome,
  ReviewEvent,
  WeeklyPlanBlock,
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
  addModule: (payload: AddModulePayload) => Promise<void>;
  deleteModule: (id: string) => Promise<void>;
  updateModuleProgress: (id: string, changes: { lastStudied?: Date }) => Promise<void>;
  ingestStudyMaterials: (id: string, attachments: ChatAttachment[], extractedSubtopics?: Record<string, string[]>) => Promise<void>;
  recordReviewOutcome: (moduleId: string, subtopicId: string, outcome: ReviewOutcome, note: string) => Promise<void>;
  updateModuleDiagnostic: (moduleId: string, diagnostic: DiagnosticProfile) => Promise<void>;
  appendChatMessages: (moduleId: string, messages: ChatMessage[]) => Promise<void>;
  markModuleCheckIn: (moduleId: string) => Promise<void>;
  recordCoachNudge: (moduleId: string) => Promise<void>;
  setWeeklyPlanBlockCompletion: (moduleId: string, blockId: string, isCompleted: boolean) => Promise<void>;
}

const ModulesContext = createContext<ModulesContextType>({
  modules: [],
  loading: true,
  addModule: async () => {},
  deleteModule: async () => {},
  updateModuleProgress: async () => {},
  ingestStudyMaterials: async () => {},
  recordReviewOutcome: async () => {},
  updateModuleDiagnostic: async () => {},
  appendChatMessages: async () => {},
  markModuleCheckIn: async () => {},
  recordCoachNudge: async () => {},
  setWeeklyPlanBlockCompletion: async () => {},
});

type TopicRow = {
  id?: string;
  module_id?: string;
  student_id: string;
  name: string;
  subtitle?: string;
  tags?: string[];
  last_studied_at?: string | null;
  overall_mastery?: number;
  status?: Module["status"];
  status_label?: string;
  learning_summary?: string[];
  last_check_in_at?: string | null;
};

type SubtopicRow = {
  id: string;
  module_id: string;
  name: string;
  mastery?: number;
  mistake_count?: number;
  attempts?: number;
  completed?: boolean;
  forgetting_risk?: "low" | "medium" | "high";
  review_interval_days?: number;
  last_reviewed_at?: string | null;
  review_due_at?: string | null;
};

type DiagnosticRow = {
  module_id: string;
  goal: string;
  deadline?: string | null;
  weekly_study_minutes?: number;
  baseline_confidence?: number;
  known_weak_areas?: string[];
  constraints?: string | null;
  recommended_focus?: string[];
  created_at?: string;
};

type ReviewEventRow = {
  subtopic_id: string;
  outcome: ReviewOutcome;
  event_source: ReviewEvent["source"];
  note: string;
  created_at: string;
};

type MasteryHistoryRow = {
  subtopic_id: string;
  score: number;
  reason: string;
  recorded_at: string;
};

type MistakeRow = {
  id: string;
  module_id: string;
  subtopic_id?: string | null;
  severity: "high" | "medium" | "low";
  trigger: string;
  next_step: string;
  created_at: string;
};

type PlanRow = {
  id: string;
  module_id: string;
  title: string;
  reason: string;
  minutes: number;
  block_type: WeeklyPlanBlock["type"];
  scheduled_for?: string | null;
  is_completed?: boolean;
};

type AccountabilityStateRow = {
  module_id: string;
  streak_days?: number;
  last_nudge_at?: string | null;
  last_check_in_at?: string | null;
};

type AccountabilityDayRow = {
  module_id: string;
  completed_on: string;
};

type SourceReferenceRow = {
  subtopic_id: string;
  source_name: string;
  snippet?: string | null;
};

type ChatMessageRow = {
  id: string;
  module_id: string;
  student_id: string;
  role: ChatMessage["role"];
  content: string;
  confidence?: AiMessageMeta["confidence"] | null;
  confidence_reason?: string | null;
  message_mode?: string | null;
  created_at: string;
};

type ChatAttachmentRow = {
  message_id: string;
  source_name: string;
  size_label?: string | null;
  category: ChatAttachment["category"];
  mime_type?: string | null;
  content_excerpt?: string | null;
};

type ChatCitationRow = {
  message_id: string;
  source_name: string;
  snippet?: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function useModules() {
  return useContext(ModulesContext);
}

function getTopicRowId(row: any): string | undefined {
  return row?.module_id ?? row?.id;
}

function isPersistedModule(moduleId: string): boolean {
  return !moduleId.startsWith("mock-module-");
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function sortByTimestamp<T>(items: T[], getValue: (item: T) => string | undefined | null): T[] {
  return [...items].sort((left, right) => {
    const leftValue = new Date(getValue(left) || 0).getTime();
    const rightValue = new Date(getValue(right) || 0).getTime();
    return leftValue - rightValue;
  });
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    const bucket = groups.get(key) || [];
    bucket.push(item);
    groups.set(key, bucket);
  }
  return groups;
}

function logSupabaseError(scope: string, error: { message?: string } | null): void {
  if (error) {
    console.log(`${scope}:`, error.message || error);
  }
}

function toDateKey(value: Date = new Date()): string {
  return value.toISOString().slice(0, 10);
}

function isSameDateKey(left?: string, right?: string): boolean {
  return Boolean(left && right && left.slice(0, 10) === right.slice(0, 10));
}

function dedupeDateKeys(values: string[]): string[] {
  return [...new Set(values.map((value) => value.slice(0, 10)))].sort();
}

function normalizeChatMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    ...message,
    id: isUuid(message.id) ? message.id : crypto.randomUUID(),
  }));
}

function extractAttachmentExcerpt(attachment: ChatAttachment): string | null {
  if (attachment.content) {
    return attachment.content.slice(0, 400);
  }
  if (attachment.dataUrl) {
    return attachment.dataUrl.slice(0, 400);
  }
  return null;
}

async function selectRows<T>(table: string, buildQuery: (query: any) => any): Promise<T[]> {
  const { data, error } = await buildQuery(supabase.from(table).select("*"));
  if (error) {
    logSupabaseError(`Error fetching ${table}`, error);
    return [];
  }
  return (data || []) as T[];
}

function normalizeModuleIds(module: Module): Module {
  const subtopicIdMap = new Map<string, string>();
  const normalizedSubtopics = module.subtopics.map((subtopic) => {
    const nextId = isUuid(subtopic.id) ? subtopic.id : crypto.randomUUID();
    subtopicIdMap.set(subtopic.id, nextId);
    return {
      ...subtopic,
      id: nextId,
      reviewHistory: (subtopic.reviewHistory || []).map((event) => ({
        ...event,
        subtopicId: nextId,
      })),
    };
  });

  const remapSubtopicId = (value?: string) => {
    if (!value) return value;
    return subtopicIdMap.get(value) || value;
  };

  return {
    ...module,
    subtopics: normalizedSubtopics,
    weeklyPlan: (module.weeklyPlan || []).map((block) => ({
      ...block,
      id: isUuid(block.id) ? block.id : crypto.randomUUID(),
    })),
    mistakeHistory: (module.mistakeHistory || []).map((mistake) => ({
      ...mistake,
      subtopicId: remapSubtopicId(mistake.subtopicId) || mistake.subtopicId,
    })),
    dueToday: (module.dueToday || []).map((item) => ({
      ...item,
      subtopicId: remapSubtopicId(item.subtopicId) || item.subtopicId,
    })),
  };
}

function mergeModuleWithTopicRow(row: TopicRow): Module {
  const moduleId = getTopicRowId(row) || crypto.randomUUID();
  const baseModule = createNewModule(row.name, row.subtitle || "", row.tags || [], moduleId);
  return {
    ...baseModule,
    subtitle: row.subtitle || "",
    tags: row.tags || [],
    lastStudied: row.last_studied_at ? new Date(row.last_studied_at) : baseModule.lastStudied,
    overallMastery: row.overall_mastery ?? baseModule.overallMastery,
    status: row.status || baseModule.status,
    statusLabel: row.status_label || baseModule.statusLabel,
    learningSummary: Array.isArray(row.learning_summary) && row.learning_summary.length > 0
      ? row.learning_summary
      : baseModule.learningSummary,
    lastCheckInAt: row.last_check_in_at || undefined,
  };
}

async function persistTopicRow(module: Module, userId: string): Promise<void> {
  const { error } = await supabase
    .from("topics")
    .update({
      name: module.name,
      subtitle: module.subtitle,
      tags: module.tags,
      last_studied_at: module.lastStudied.toISOString(),
      overall_mastery: module.overallMastery,
      status: module.status,
      status_label: module.statusLabel,
      learning_summary: module.learningSummary,
      last_check_in_at: module.lastCheckInAt || null,
    })
    .eq("module_id", module.id)
    .eq("student_id", userId);

  logSupabaseError("Error syncing topic", error);
}

async function persistDiagnostic(module: Module, userId: string): Promise<void> {
  if (!module.diagnostic) {
    const { error } = await supabase.from("topic_diagnostics").delete().eq("module_id", module.id).eq("student_id", userId);
    logSupabaseError("Error deleting topic diagnostic", error);
    return;
  }

  const { error } = await supabase.from("topic_diagnostics").upsert({
    module_id: module.id,
    student_id: userId,
    goal: module.diagnostic.goal,
    deadline: module.diagnostic.deadline || null,
    weekly_study_minutes: module.diagnostic.weeklyStudyMinutes,
    baseline_confidence: module.diagnostic.baselineConfidence,
    known_weak_areas: module.diagnostic.knownWeakAreas,
    constraints: module.diagnostic.constraints || null,
    recommended_focus: module.diagnostic.recommendedFocus,
  }, { onConflict: "module_id" });

  logSupabaseError("Error syncing topic diagnostic", error);
}

async function persistSubtopics(module: Module): Promise<void> {
  if (module.subtopics.length === 0) {
    return;
  }

  const { error } = await supabase.from("subtopics").upsert(
    module.subtopics.map((subtopic) => ({
      id: subtopic.id,
      module_id: module.id,
      name: subtopic.name,
      mastery: subtopic.mastery,
      mistake_count: subtopic.mistakeCount,
      attempts: subtopic.attempts,
      completed: subtopic.completed,
      forgetting_risk: subtopic.forgettingRisk,
      review_interval_days: subtopic.reviewIntervalDays || 1,
      last_reviewed_at: subtopic.lastReviewedAt || null,
      review_due_at: subtopic.reviewDueAt || null,
    })),
    { onConflict: "id" },
  );

  logSupabaseError("Error syncing subtopics", error);
}

async function replaceReviewEvents(module: Module, userId: string): Promise<void> {
  const { error: deleteError } = await supabase.from("subtopic_review_events").delete().eq("module_id", module.id).eq("student_id", userId);
  logSupabaseError("Error clearing review events", deleteError);

  const rows = module.subtopics.flatMap((subtopic) =>
    (subtopic.reviewHistory || []).map((event) => ({
      module_id: module.id,
      subtopic_id: subtopic.id,
      student_id: userId,
      outcome: event.outcome,
      event_source: event.source,
      note: event.note,
      created_at: event.createdAt,
    })),
  );

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from("subtopic_review_events").insert(rows);
  logSupabaseError("Error syncing review events", error);
}

async function replaceMasteryHistory(module: Module, userId: string): Promise<void> {
  const { error: deleteError } = await supabase.from("subtopic_mastery_history").delete().eq("module_id", module.id).eq("student_id", userId);
  logSupabaseError("Error clearing mastery history", deleteError);

  const rows = module.subtopics.flatMap((subtopic) =>
    (subtopic.masteryHistory || []).map((entry) => ({
      module_id: module.id,
      subtopic_id: subtopic.id,
      student_id: userId,
      score: entry.score,
      reason: entry.reason,
      recorded_at: entry.recordedAt,
    })),
  );

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from("subtopic_mastery_history").insert(rows);
  logSupabaseError("Error syncing mastery history", error);
}

async function replaceMistakes(module: Module, userId: string): Promise<void> {
  const { error: deleteError } = await supabase.from("topic_mistake_records").delete().eq("module_id", module.id).eq("student_id", userId);
  logSupabaseError("Error clearing mistake history", deleteError);

  const rows = (module.mistakeHistory || []).map((mistake) => ({
    module_id: module.id,
    student_id: userId,
    subtopic_id: mistake.subtopicId || null,
    severity: mistake.severity,
    trigger: mistake.trigger,
    next_step: mistake.nextStep,
    created_at: mistake.createdAt,
  }));

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from("topic_mistake_records").insert(rows);
  logSupabaseError("Error syncing mistake history", error);
}

async function replaceWeeklyPlan(module: Module, userId: string): Promise<void> {
  const { error: deleteError } = await supabase.from("topic_weekly_plan_blocks").delete().eq("module_id", module.id).eq("student_id", userId);
  logSupabaseError("Error clearing weekly plan", deleteError);

  const rows = (module.weeklyPlan || []).map((block) => ({
    module_id: module.id,
    student_id: userId,
    id: block.id,
    title: block.title,
    reason: block.reason,
    minutes: block.minutes,
    block_type: block.type,
    scheduled_for: block.scheduledFor || null,
    is_completed: block.isCompleted ?? false,
  }));

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from("topic_weekly_plan_blocks").insert(rows);
  logSupabaseError("Error syncing weekly plan", error);
}

async function appendChatRows(moduleId: string, userId: string, messages: ChatMessage[]): Promise<void> {
  if (messages.length === 0) {
    return;
  }

  const normalizedMessages = normalizeChatMessages(messages);
  const messageIds = normalizedMessages.map((message) => message.id);
  const messageRows = normalizedMessages.map((message) => ({
    id: message.id,
    module_id: moduleId,
    student_id: userId,
    role: message.role,
    content: message.content,
    confidence: message.meta?.confidence || null,
    confidence_reason: message.meta?.confidenceReason || null,
    message_mode: message.meta?.mode || null,
    created_at: message.timestamp.toISOString(),
  }));

  const { error: messageError } = await supabase.from("topic_chat_messages").upsert(messageRows, { onConflict: "id" });
  logSupabaseError("Error syncing chat messages", messageError);

  if (messageIds.length > 0) {
    const [{ error: deleteAttachmentError }, { error: deleteCitationError }] = await Promise.all([
      supabase.from("topic_chat_attachments").delete().in("message_id", messageIds),
      supabase.from("topic_chat_message_citations").delete().in("message_id", messageIds),
    ]);
    logSupabaseError("Error clearing chat attachments", deleteAttachmentError);
    logSupabaseError("Error clearing chat citations", deleteCitationError);
  }

  const attachmentRows = normalizedMessages.flatMap((message) =>
    (message.attachments || []).map((attachment) => ({
      message_id: message.id,
      source_name: attachment.name,
      size_label: attachment.size,
      category: attachment.category,
      mime_type: attachment.mimeType || null,
      content_excerpt: extractAttachmentExcerpt(attachment),
    })),
  );

  if (attachmentRows.length > 0) {
    const { error: attachmentError } = await supabase.from("topic_chat_attachments").insert(attachmentRows);
    logSupabaseError("Error syncing chat attachments", attachmentError);
  }

  const citationRows = normalizedMessages.flatMap((message) =>
    (message.meta?.citations || []).map((citation) => ({
      message_id: message.id,
      source_name: citation.sourceName,
      snippet: citation.snippet || null,
    })),
  );

  if (citationRows.length > 0) {
    const { error: citationError } = await supabase.from("topic_chat_message_citations").insert(citationRows);
    logSupabaseError("Error syncing chat citations", citationError);
  }
}

async function replaceAccountability(module: Module, userId: string): Promise<void> {
  const accountability = module.accountability || {
    streakDays: 0,
    completedReviewDates: [],
    lastNudgeAt: undefined,
  };

  const { error: stateError } = await supabase.from("topic_accountability_state").upsert({
    module_id: module.id,
    student_id: userId,
    streak_days: accountability.streakDays,
    last_nudge_at: accountability.lastNudgeAt || null,
    last_check_in_at: module.lastCheckInAt || null,
  }, { onConflict: "module_id" });
  logSupabaseError("Error syncing accountability state", stateError);

  const { error: deleteError } = await supabase.from("topic_accountability_days").delete().eq("module_id", module.id).eq("student_id", userId);
  logSupabaseError("Error clearing accountability days", deleteError);

  const rows = accountability.completedReviewDates.map((completedOn) => ({
    module_id: module.id,
    student_id: userId,
    completed_on: completedOn.slice(0, 10),
  }));

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from("topic_accountability_days").insert(rows);
  logSupabaseError("Error syncing accountability days", error);
}

async function replaceSourceReferences(module: Module): Promise<void> {
  const subtopicIds = module.subtopics.map((subtopic) => subtopic.id);
  if (subtopicIds.length === 0) {
    return;
  }

  const { error: deleteError } = await supabase.from("subtopic_source_references").delete().in("subtopic_id", subtopicIds);
  logSupabaseError("Error clearing subtopic source references", deleteError);

  const rows = module.subtopics.flatMap((subtopic) =>
    (subtopic.sourceReferences || []).map((reference) => ({
      subtopic_id: subtopic.id,
      source_name: reference.sourceName,
      snippet: reference.snippet || null,
    })),
  );

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from("subtopic_source_references").insert(rows);
  logSupabaseError("Error syncing subtopic source references", error);
}

async function insertUploads(moduleId: string, userId: string, attachments: ChatAttachment[]): Promise<void> {
  if (attachments.length === 0) {
    return;
  }

  const rows = attachments.map((attachment) => ({
    module_id: moduleId,
    student_id: userId,
    source_name: attachment.name,
    category: attachment.category,
    mime_type: attachment.mimeType || null,
    source_kind: attachment.content ? "clipboard" : "upload",
    content_excerpt: attachment.content ? attachment.content.slice(0, 400) : null,
  }));

  const { error } = await supabase.from("study_material_uploads").insert(rows);
  logSupabaseError("Error saving uploaded study materials", error);
}

async function syncModuleEvidence(module: Module, userId: string): Promise<void> {
  if (!isPersistedModule(module.id)) {
    return;
  }

  await persistTopicRow(module, userId);
  await persistDiagnostic(module, userId);
  await persistSubtopics(module);
  await Promise.all([
    replaceSourceReferences(module),
    replaceReviewEvents(module, userId),
    replaceMasteryHistory(module, userId),
    replaceMistakes(module, userId),
    replaceWeeklyPlan(module, userId),
    replaceAccountability(module, userId),
  ]);
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

  useEffect(() => {
    if (!user) {
      setModules([]);
      setLoading(false);
      return;
    }

    const fetchModules = async () => {
      setLoading(true);
      const topics = await selectRows<TopicRow>("topics", (query) =>
        query.eq("student_id", user.id).order("created_at", { ascending: true }),
      );

      if (topics.length === 0) {
        const baseModules = [createMockModuleWithHistory(), createInactiveReminderModule()];
        setModules(baseModules);
        setLoading(false);
        return;
      }

      const moduleIds = topics.map((row) => getTopicRowId(row)).filter(Boolean) as string[];
      const subtopics = moduleIds.length > 0
        ? await selectRows<SubtopicRow>("subtopics", (query) => query.in("module_id", moduleIds).order("created_at", { ascending: true }))
        : [];
      const subtopicIds = subtopics.map((row) => row.id);

      const [diagnostics, mistakes, weeklyPlanRows, accountabilityStates, accountabilityDays, reviewEvents, masteryHistory, sourceReferences, chatMessages] = await Promise.all([
        moduleIds.length > 0 ? selectRows<DiagnosticRow>("topic_diagnostics", (query) => query.in("module_id", moduleIds)) : Promise.resolve([]),
        moduleIds.length > 0 ? selectRows<MistakeRow>("topic_mistake_records", (query) => query.in("module_id", moduleIds).eq("student_id", user.id).order("created_at", { ascending: false })) : Promise.resolve([]),
        moduleIds.length > 0 ? selectRows<PlanRow>("topic_weekly_plan_blocks", (query) => query.in("module_id", moduleIds).eq("student_id", user.id).order("created_at", { ascending: true })) : Promise.resolve([]),
        moduleIds.length > 0 ? selectRows<AccountabilityStateRow>("topic_accountability_state", (query) => query.in("module_id", moduleIds).eq("student_id", user.id)) : Promise.resolve([]),
        moduleIds.length > 0 ? selectRows<AccountabilityDayRow>("topic_accountability_days", (query) => query.in("module_id", moduleIds).eq("student_id", user.id).order("completed_on", { ascending: true })) : Promise.resolve([]),
        subtopicIds.length > 0 ? selectRows<ReviewEventRow>("subtopic_review_events", (query) => query.in("subtopic_id", subtopicIds).eq("student_id", user.id).order("created_at", { ascending: true })) : Promise.resolve([]),
        subtopicIds.length > 0 ? selectRows<MasteryHistoryRow>("subtopic_mastery_history", (query) => query.in("subtopic_id", subtopicIds).eq("student_id", user.id).order("recorded_at", { ascending: true })) : Promise.resolve([]),
        subtopicIds.length > 0 ? selectRows<SourceReferenceRow>("subtopic_source_references", (query) => query.in("subtopic_id", subtopicIds)) : Promise.resolve([]),
        moduleIds.length > 0 ? selectRows<ChatMessageRow>("topic_chat_messages", (query) => query.in("module_id", moduleIds).eq("student_id", user.id).order("created_at", { ascending: true })) : Promise.resolve([]),
      ]);

      const chatMessageIds = chatMessages.map((row) => row.id);
      const [chatAttachments, chatCitations] = await Promise.all([
        chatMessageIds.length > 0 ? selectRows<ChatAttachmentRow>("topic_chat_attachments", (query) => query.in("message_id", chatMessageIds)) : Promise.resolve([]),
        chatMessageIds.length > 0 ? selectRows<ChatCitationRow>("topic_chat_message_citations", (query) => query.in("message_id", chatMessageIds)) : Promise.resolve([]),
      ]);

      const diagnosticsByModule = new Map(diagnostics.map((row) => [row.module_id, row]));
      const subtopicsByModule = groupBy(subtopics, (row) => row.module_id);
      const mistakesByModule = groupBy(mistakes, (row) => row.module_id);
      const planByModule = groupBy(weeklyPlanRows, (row) => row.module_id);
      const accountabilityStateByModule = new Map(accountabilityStates.map((row) => [row.module_id, row]));
      const accountabilityDaysByModule = groupBy(accountabilityDays, (row) => row.module_id);
      const reviewEventsBySubtopic = groupBy(reviewEvents, (row) => row.subtopic_id);
      const masteryHistoryBySubtopic = groupBy(masteryHistory, (row) => row.subtopic_id);
      const sourceReferencesBySubtopic = groupBy(sourceReferences, (row) => row.subtopic_id);
      const chatMessagesByModule = groupBy(chatMessages, (row) => row.module_id);
      const chatAttachmentsByMessage = groupBy(chatAttachments, (row) => row.message_id);
      const chatCitationsByMessage = groupBy(chatCitations, (row) => row.message_id);

      const loaded: Module[] = topics.map((topicRow) => {
        const moduleId = getTopicRowId(topicRow) || crypto.randomUUID();
        const baseModule = mergeModuleWithTopicRow(topicRow);
        const moduleSubtopics = (subtopicsByModule.get(moduleId) || []).map((subtopic) => ({
          id: subtopic.id,
          name: subtopic.name,
          mastery: subtopic.mastery ?? 0,
          mistakeCount: subtopic.mistake_count ?? 0,
          attempts: subtopic.attempts ?? 0,
          completed: subtopic.completed ?? false,
          forgettingRisk: subtopic.forgetting_risk || "low",
          reviewIntervalDays: subtopic.review_interval_days ?? 1,
          lastReviewedAt: subtopic.last_reviewed_at || undefined,
          reviewDueAt: subtopic.review_due_at || undefined,
          reviewHistory: sortByTimestamp(reviewEventsBySubtopic.get(subtopic.id) || [], (row) => row.created_at).map((row) => ({
            id: crypto.randomUUID(),
            subtopicId: subtopic.id,
            subtopicName: subtopic.name,
            outcome: row.outcome,
            createdAt: row.created_at,
            source: row.event_source,
            note: row.note,
          })),
          masteryHistory: sortByTimestamp(masteryHistoryBySubtopic.get(subtopic.id) || [], (row) => row.recorded_at).map((row) => ({
            recordedAt: row.recorded_at,
            score: row.score,
            reason: row.reason,
          })),
          sourceReferences: (sourceReferencesBySubtopic.get(subtopic.id) || []).map((row) => ({
            sourceName: row.source_name,
            snippet: row.snippet || undefined,
          })) as CitationRef[],
        }));

        const diagnosticRow = diagnosticsByModule.get(moduleId);
        const accountabilityState = accountabilityStateByModule.get(moduleId);
        const accountabilityDates = (accountabilityDaysByModule.get(moduleId) || []).map((row) => row.completed_on);
        const enriched = enrichModuleWithEvidence({
          ...baseModule,
          subtopics: moduleSubtopics,
          diagnostic: diagnosticRow ? {
            goal: diagnosticRow.goal,
            deadline: diagnosticRow.deadline || undefined,
            weeklyStudyMinutes: diagnosticRow.weekly_study_minutes ?? 90,
            baselineConfidence: diagnosticRow.baseline_confidence ?? 50,
            knownWeakAreas: diagnosticRow.known_weak_areas || [],
            constraints: diagnosticRow.constraints || undefined,
            createdAt: diagnosticRow.created_at || new Date().toISOString(),
            recommendedFocus: diagnosticRow.recommended_focus || [],
          } : undefined,
          mistakeHistory: (mistakesByModule.get(moduleId) || []).map((row) => ({
            id: row.id,
            subtopicId: row.subtopic_id || "",
            subtopicName: moduleSubtopics.find((subtopic) => subtopic.id === row.subtopic_id)?.name || "Unassigned",
            createdAt: row.created_at,
            severity: row.severity,
            trigger: row.trigger,
            nextStep: row.next_step,
          })),
          weeklyPlan: (planByModule.get(moduleId) || []).map((row) => ({
            id: row.id,
            moduleId,
            title: row.title,
            reason: row.reason,
            minutes: row.minutes,
            type: row.block_type,
            scheduledFor: row.scheduled_for || undefined,
            isCompleted: row.is_completed ?? false,
          })),
          chatHistory: (chatMessagesByModule.get(moduleId) || []).map((row) => ({
            id: row.id,
            role: row.role,
            content: row.content,
            timestamp: new Date(row.created_at),
            attachments: (chatAttachmentsByMessage.get(row.id) || []).map((attachment) => ({
              id: `${row.id}-${attachment.source_name}`,
              name: attachment.source_name,
              size: attachment.size_label || "Stored",
              category: attachment.category,
              mimeType: attachment.mime_type || undefined,
              content: attachment.content_excerpt || undefined,
            })),
            meta: {
              confidence: row.confidence || undefined,
              confidenceReason: row.confidence_reason || undefined,
              mode: row.message_mode || undefined,
              citations: (chatCitationsByMessage.get(row.id) || []).map((citation) => ({
                sourceName: citation.source_name,
                snippet: citation.snippet || undefined,
              })),
            },
          })),
          accountability: {
            streakDays: accountabilityState?.streak_days ?? accountabilityDates.length,
            completedReviewDates: accountabilityDates,
            lastNudgeAt: accountabilityState?.last_nudge_at || undefined,
          },
          lastCheckInAt: topicRow.last_check_in_at || accountabilityState?.last_check_in_at || undefined,
        });

        if ((planByModule.get(moduleId) || []).length > 0) {
          enriched.weeklyPlan = (planByModule.get(moduleId) || []).map((row) => ({
            id: row.id,
            moduleId,
            title: row.title,
            reason: row.reason,
            minutes: row.minutes,
            type: row.block_type,
            scheduledFor: row.scheduled_for || undefined,
            isCompleted: row.is_completed ?? false,
          }));
        }

        if (enriched.chatHistory.length === 0) {
          enriched.chatHistory = baseModule.chatHistory;
        }

        return enriched;
      });

      const merged = [...loaded];
      for (const mockModule of [createMockModuleWithHistory(), createInactiveReminderModule()]) {
        if (!merged.some((moduleItem) => moduleItem.id === mockModule.id)) {
          merged.unshift(mockModule);
        }
      }

      setModules(merged);
      setLoading(false);
    };

    void fetchModules();
  }, [user]);

  const updateModules = (updater: (previous: Module[]) => Module[]) => {
    setModules((previous) => {
      const next = updater(previous).map((moduleItem) => enrichModuleWithEvidence(moduleItem));
      return next;
    });
  };

  const updateAndPersistModule = async (
    moduleId: string,
    updater: (moduleItem: Module) => Module,
    options?: { attachments?: ChatAttachment[] },
  ) => {
    let nextModule: Module | undefined;

    setModules((previous) => previous.map((moduleItem) => {
      if (moduleItem.id !== moduleId) return moduleItem;
      const updated = normalizeModuleIds(enrichModuleWithEvidence(updater(moduleItem)));
      nextModule = updated;
      return updated;
    }));

    if (!nextModule || !user || !isPersistedModule(moduleId)) {
      return;
    }

    await syncModuleEvidence(nextModule, user.id);
    if (options?.attachments?.length) {
      await insertUploads(moduleId, user.id, options.attachments);
    }
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
    const configured = normalizeModuleIds(buildModuleFromDiagnostic(baseModule, toDiagnostic(payload), payload.initialSubtopics));
    updateModules((previous) => [...previous, configured]);
    await syncModuleEvidence(configured, user.id);
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

  const updateModuleProgress = async (id: string, changes: { lastStudied?: Date }) => {
    await updateAndPersistModule(id, (moduleItem) => ({
      ...moduleItem,
      lastStudied: changes.lastStudied ?? moduleItem.lastStudied,
    }));
  };

  const ingestStudyMaterials = async (id: string, attachments: ChatAttachment[], extractedSubtopics?: Record<string, string[]>) => {
    await updateAndPersistModule(id, (moduleItem) => {
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
    }, { attachments });
  };

  const recordReviewOutcome = async (moduleId: string, subtopicId: string, outcome: ReviewOutcome, note: string) => {
    await updateAndPersistModule(moduleId, (moduleItem) => {
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
    });
  };

  const updateModuleDiagnostic = async (moduleId: string, diagnostic: DiagnosticProfile) => {
    await updateAndPersistModule(moduleId, (moduleItem) => {
      if (moduleItem.id !== moduleId) return moduleItem;
      return enrichModuleWithEvidence({
        ...moduleItem,
        diagnostic,
      });
    });
  };

  const appendChatMessages = async (moduleId: string, messages: ChatMessage[]) => {
    const normalizedMessages = normalizeChatMessages(messages);

    setModules((previous) => previous.map((moduleItem) => {
      if (moduleItem.id !== moduleId) return moduleItem;
      const existingIds = new Set(moduleItem.chatHistory.map((message) => message.id));
      const mergedHistory = [
        ...moduleItem.chatHistory,
        ...normalizedMessages.filter((message) => !existingIds.has(message.id)),
      ].sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());

      return {
        ...moduleItem,
        chatHistory: mergedHistory,
      };
    }));

    if (!user || !isPersistedModule(moduleId)) {
      return;
    }

    await appendChatRows(moduleId, user.id, normalizedMessages);
  };

  const markModuleCheckIn = async (moduleId: string) => {
    const today = toDateKey();
    await updateAndPersistModule(moduleId, (moduleItem) => ({
      ...moduleItem,
      lastCheckInAt: new Date().toISOString(),
      accountability: {
        streakDays: moduleItem.accountability?.streakDays || 0,
        completedReviewDates: dedupeDateKeys(moduleItem.accountability?.completedReviewDates || []).includes(today)
          ? dedupeDateKeys(moduleItem.accountability?.completedReviewDates || [])
          : [...dedupeDateKeys(moduleItem.accountability?.completedReviewDates || []), today].sort(),
        lastNudgeAt: moduleItem.accountability?.lastNudgeAt,
      },
    }));
  };

  const recordCoachNudge = async (moduleId: string) => {
    await updateAndPersistModule(moduleId, (moduleItem) => ({
      ...moduleItem,
      accountability: {
        streakDays: moduleItem.accountability?.streakDays || 0,
        completedReviewDates: dedupeDateKeys(moduleItem.accountability?.completedReviewDates || []),
        lastNudgeAt: new Date().toISOString(),
      },
    }));
  };

  const setWeeklyPlanBlockCompletion = async (moduleId: string, blockId: string, isCompleted: boolean) => {
    await updateAndPersistModule(moduleId, (moduleItem) => ({
      ...moduleItem,
      weeklyPlan: (moduleItem.weeklyPlan || []).map((block) => (
        block.id === blockId
          ? { ...block, isCompleted }
          : block
      )),
      lastCheckInAt: isCompleted ? new Date().toISOString() : moduleItem.lastCheckInAt,
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
        appendChatMessages,
        markModuleCheckIn,
        recordCoachNudge,
        setWeeklyPlanBlockCompletion,
      }}
    >
      {children}
    </ModulesContext.Provider>
  );
}
