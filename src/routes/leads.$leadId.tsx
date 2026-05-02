import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/lib/store";
import { LeadDetailView } from "@/components/LeadControlPanel";

export const Route = createFileRoute("/leads/$leadId")({
  head: ({ params }) => ({
    meta: [
      { title: `Lead Detail — Gharpayy` },
    ],
  }),
  component: LeadDetailPage,
});

function LeadDetailPage() {
  const { leadId } = Route.useParams();
  const navigate = useNavigate();
  
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <LeadDetailView 
          leadId={leadId} 
          onClear={() => navigate({ to: "/leads" })} 
        />
      </div>
    </AppShell>
  );
}
