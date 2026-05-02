import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { liveConfidence, intentFor } from "@/lib/engine";
import { calculateLeadScore } from "@/lib/scoring";
import { isLeadOverdue, getStageSlaHours } from "@/lib/overdue";
import { useMountedNow } from "@/hooks/use-now";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import type { Lead, LeadStage } from "@/lib/types";
import {
  AlertTriangle,
  GripVertical,
  IndianRupee,
  ArrowRight,
  Kanban,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline — Gharpayy CRM" },
      { name: "description", content: "Kanban pipeline view with drag-and-drop stage management." },
    ],
  }),
  component: PipelinePage,
});

const STAGES: { id: LeadStage; label: string; color: string; bg: string; headerBg: string }[] = [
  { id: "new", label: "New", color: "text-gray-600", bg: "bg-gray-50", headerBg: "bg-gray-500" },
  { id: "contacted", label: "Contacted", color: "text-blue-600", bg: "bg-blue-50", headerBg: "bg-blue-500" },
  { id: "tour-scheduled", label: "Tour Scheduled", color: "text-amber-600", bg: "bg-amber-50", headerBg: "bg-amber-500" },
  { id: "tour-done", label: "Tour Done", color: "text-violet-600", bg: "bg-violet-50", headerBg: "bg-violet-500" },
  { id: "negotiation", label: "Negotiation", color: "text-orange-600", bg: "bg-orange-50", headerBg: "bg-orange-500" },
  { id: "booked", label: "Booked", color: "text-green-600", bg: "bg-green-50", headerBg: "bg-green-500" },
  { id: "dropped", label: "Lost", color: "text-red-600", bg: "bg-red-50", headerBg: "bg-red-500" },
];

const INTENT_COLORS = {
  hot: "bg-red-500 text-white",
  warm: "bg-amber-500 text-white",
  cold: "bg-blue-500 text-white",
} as const;

function IntentBadge({ intent }: { intent: "hot" | "warm" | "cold" }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide", INTENT_COLORS[intent])}>
      {intent}
    </span>
  );
}

function LeadKanbanCard({
  lead,
  tcms,
  now,
  isDragging = false,
}: {
  lead: Lead;
  tcms: ReturnType<typeof useApp>["tcms"];
  now: number;
  isDragging?: boolean;
}) {
  const score = calculateLeadScore(lead, now);
  const intent = intentFor(score);
  const tcm = tcms.find((t) => t.id === lead.assignedTcmId);
  const isOverdue = isLeadOverdue(lead, now);
  const slaLimit = getStageSlaHours(lead.stage);

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-3 space-y-2 transition-all duration-150",
        isDragging ? "shadow-xl rotate-1 scale-105 opacity-90" : "hover:shadow-md hover:border-accent/40",
        isOverdue && "border-l-4 border-l-destructive",
      )}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{lead.name}</div>
          <div className="text-[10px] text-muted-foreground font-mono">{lead.phone}</div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <IntentBadge intent={intent} />
          <div className="text-[10px] font-bold text-accent">Score: {score}</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{lead.preferredArea}</span>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5 font-medium">
            <IndianRupee className="h-2.5 w-2.5" />
            {(lead.budget / 1000).toFixed(0)}k
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {tcm && (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground text-[9px] font-semibold" title={tcm.name}>
              {tcm.initials}
            </span>
          )}
          {slaLimit && (
            <span className={cn(
              "text-[9px] px-1.5 py-0.5 rounded-full font-mono",
              isOverdue ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-muted text-muted-foreground"
            )}>
              {slaLimit}h SLA
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          {isOverdue && (
            <AlertTriangle className="h-3 w-3 text-destructive animate-pulse" />
          )}
          <span className={cn("text-[10px]", isOverdue ? "text-destructive font-semibold" : "text-muted-foreground")}>
            {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
}

function SortableLeadCard({
  lead,
  tcms,
  now,
  onSelect,
}: {
  lead: Lead;
  tcms: ReturnType<typeof useApp>["tcms"];
  now: number;
  onSelect: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { lead },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <button
        className="absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted-foreground z-10"
        {...listeners}
        {...attributes}
        aria-label="Drag handle"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button className="w-full text-left" onClick={() => onSelect(lead.id)}>
        <LeadKanbanCard lead={lead} tcms={tcms} now={now} />
      </button>
    </div>
  );
}

function KanbanColumn({
  stage,
  leads,
  tcms,
  now,
  onSelect,
}: {
  stage: typeof STAGES[number];
  leads: Lead[];
  tcms: ReturnType<typeof useApp>["tcms"];
  now: number;
  onSelect: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const totalBudget = leads.reduce((s, l) => s + l.budget, 0);

  return (
    <div className="flex flex-col min-w-[220px] w-[220px] shrink-0">
      {/* Column Header */}
      <div className={cn("rounded-t-xl px-3 py-2.5", stage.headerBg)}>
        <div className="flex items-center justify-between">
          <span className="text-white text-xs font-semibold">{stage.label}</span>
          <span className="text-white/80 text-[10px] font-mono">{leads.length}</span>
        </div>
        {leads.length > 0 && (
          <div className="text-white/70 text-[10px] mt-0.5">
            ₹{(totalBudget / 1000).toFixed(0)}k pipeline
          </div>
        )}
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[120px] rounded-b-xl border border-t-0 border-border p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-240px)] transition-colors",
          stage.bg,
          isOver && "ring-2 ring-inset ring-accent/50 bg-accent/5",
        )}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <SortableLeadCard
              key={lead.id}
              lead={lead}
              tcms={tcms}
              now={now}
              onSelect={onSelect}
            />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="flex items-center justify-center h-16 text-[11px] text-muted-foreground border-2 border-dashed border-border rounded-lg">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

function PipelinePage() {
  const { leads, tcms, setLeadStage, selectLead } = useApp();
  const [now, mounted] = useMountedNow();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overdueOnly, setOverdueOnly] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const filteredLeads = useMemo(() => {
    if (!overdueOnly) return leads;
    return leads.filter(l => isLeadOverdue(l, now));
  }, [leads, overdueOnly, now]);

  const leadsByStage = useMemo(() => {
    const map = new Map<LeadStage, Lead[]>();
    for (const s of STAGES) map.set(s.id, []);
    for (const l of filteredLeads) {
      const bucket = map.get(l.stage);
      if (bucket) bucket.push(l);
    }
    // Sort each bucket by calculated score desc
    for (const [, bucket] of map) {
      bucket.sort((a, b) => calculateLeadScore(b, now) - calculateLeadScore(a, now));
    }
    return map;
  }, [filteredLeads, now]);

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    // Determine target stage — over.id is a stage id if dropped on column, or a lead id
    let targetStage: LeadStage | undefined;
    // Check if over.id is a stage
    const stageMatch = STAGES.find((s) => s.id === over.id);
    if (stageMatch) {
      targetStage = stageMatch.id;
    } else {
      // over.id is another lead — find its stage
      const overLead = leads.find((l) => l.id === over.id);
      if (overLead) targetStage = overLead.stage;
    }

    if (!targetStage) return;
    const draggedLead = leads.find((l) => l.id === active.id);
    if (!draggedLead || draggedLead.stage === targetStage) return;

    setLeadStage(draggedLead.id, targetStage);
    const stageLabel = STAGES.find((s) => s.id === targetStage)?.label ?? targetStage;
    toast.success(`${draggedLead.name} moved to ${stageLabel}`);
  };

  const totalActiveLeads = leads.filter((l) => l.stage !== "dropped" && l.stage !== "booked").length;
  const totalPipeline = leads.filter((l) => l.stage !== "dropped").reduce((s, l) => s + l.budget, 0);

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Kanban className="h-5 w-5 text-accent" />
              <h1 className="font-display text-xl font-semibold">Pipeline</h1>
              {mounted && (
                <span className="text-xs text-muted-foreground font-mono">
                  {totalActiveLeads} active · ₹{(totalPipeline / 1000).toFixed(0)}k total
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Drag cards between stages to update the pipeline
            </p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
                className="rounded border-border text-accent focus:ring-accent h-3.5 w-3.5"
              />
              <span>Overdue Only</span>
            </label>
            <Link
              to="/leads"
              className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
            >
              Table view <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
            {STAGES.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                leads={leadsByStage.get(stage.id) ?? []}
                tcms={tcms}
                now={now}
                onSelect={(id) => selectLead(id)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead && (
              <LeadKanbanCard
                lead={activeLead}
                tcms={tcms}
                now={now}
                isDragging
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </AppShell>
  );
}
