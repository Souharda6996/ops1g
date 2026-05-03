import React, { Suspense, lazy } from "react";

// Lazy load the heavy recharts library
const Recharts = {
  ResponsiveContainer: lazy(() => import("recharts").then(m => ({ default: m.ResponsiveContainer }))),
  AreaChart: lazy(() => import("recharts").then(m => ({ default: m.AreaChart }))),
  Area: lazy(() => import("recharts").then(m => ({ default: m.Area }))),
  XAxis: lazy(() => import("recharts").then(m => ({ default: m.XAxis }))),
  YAxis: lazy(() => import("recharts").then(m => ({ default: m.YAxis }))),
  CartesianGrid: lazy(() => import("recharts").then(m => ({ default: m.CartesianGrid }))),
  Tooltip: lazy(() => import("recharts").then(m => ({ default: m.Tooltip }))),
  BarChart: lazy(() => import("recharts").then(m => ({ default: m.BarChart }))),
  Bar: lazy(() => import("recharts").then(m => ({ default: m.Bar }))),
  LineChart: lazy(() => import("recharts").then(m => ({ default: m.LineChart }))),
  Line: lazy(() => import("recharts").then(m => ({ default: m.Line }))),
  PieChart: lazy(() => import("recharts").then(m => ({ default: m.PieChart }))),
  Pie: lazy(() => import("recharts").then(m => ({ default: m.Pie }))),
  Cell: lazy(() => import("recharts").then(m => ({ default: m.Cell }))),
};

const ChartPlaceholder = () => (
  <div className="w-full h-full min-h-[200px] flex items-center justify-center bg-muted/20 animate-pulse rounded-lg border border-dashed">
    <div className="text-xs text-muted-foreground font-mono">loading_chart...</div>
  </div>
);

export const LazyAreaChart = (props: any) => (
  <Suspense fallback={<ChartPlaceholder />}>
    <Recharts.ResponsiveContainer width="100%" height={props.height || 300}>
      <Recharts.AreaChart {...props}>
        {props.children}
      </Recharts.AreaChart>
    </Recharts.ResponsiveContainer>
  </Suspense>
);

export const LazyBarChart = (props: any) => (
  <Suspense fallback={<ChartPlaceholder />}>
    <Recharts.ResponsiveContainer width="100%" height={props.height || 300}>
      <Recharts.BarChart {...props}>
        {props.children}
      </Recharts.BarChart>
    </Recharts.ResponsiveContainer>
  </Suspense>
);

export const LazyPieChart = (props: any) => (
  <Suspense fallback={<ChartPlaceholder />}>
    <Recharts.ResponsiveContainer width="100%" height={props.height || 300}>
      <Recharts.PieChart {...props}>
        {props.children}
      </Recharts.PieChart>
    </Recharts.ResponsiveContainer>
  </Suspense>
);

export { Recharts };
