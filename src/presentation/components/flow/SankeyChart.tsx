"use client";

/**
 * SankeyChart — วาดแผนภาพ Sankey ด้วย SVG
 *
 * d3-sankey ทำหน้าที่ "คำนวณตำแหน่ง" (x, y, ความหนาเส้น) เท่านั้น
 * ส่วนการวาดเราเขียนเองด้วย React → กำหนดสี ป้าย และการคลิกได้เต็มที่
 */
import { sankey, sankeyJustify, sankeyLinkHorizontal, type SankeyGraph } from "d3-sankey";
import { forwardRef, useMemo } from "react";
import { formatBaht } from "@/domain/entities/Money";
import type { FlowGraph, FlowLink, FlowNode } from "@/domain/services/buildFlowGraph";
import { nodeColor } from "./flowColors";

export type LabelMode = "percent" | "amount" | "none";

interface SankeyChartProps {
  graph: FlowGraph;
  labelMode: LabelMode;
  zoom: number;
  collapsedGroupIds: ReadonlySet<string>;
  onToggleGroup: (groupId: string) => void;
}

const WIDTH = 960;
const LABEL_SPACE = 240; // พื้นที่ด้านขวาสำหรับป้ายของคอลัมน์สุดท้าย
const ROW_HEIGHT = 46;

/** ความสูงของกราฟ ตามจำนวนโหนดในคอลัมน์ที่แน่นที่สุด */
function chartHeight(nodes: FlowNode[]): number {
  const count = (kinds: FlowNode["kind"][]) => nodes.filter((n) => kinds.includes(n.kind)).length;
  const densest = Math.max(count(["income", "deficit"]), count(["category"]), count(["group"]), count(["item", "remaining"]));
  return Math.max(320, densest * ROW_HEIGHT);
}

function valueText(node: FlowNode, mode: LabelMode): string | null {
  if (mode === "none") return null;
  return mode === "percent" ? `${node.percentOfIncome.toFixed(1)}%` : formatBaht(node.value);
}

export const SankeyChart = forwardRef<SVGSVGElement, SankeyChartProps>(function SankeyChart(
  { graph, labelMode, zoom, collapsedGroupIds, onToggleGroup },
  ref,
) {
  const height = chartHeight(graph.nodes);

  const layout = useMemo<SankeyGraph<FlowNode, FlowLink>>(() => {
    const generator = sankey<FlowNode, FlowLink>()
      .nodeId((node) => node.id)
      .nodeAlign(sankeyJustify)
      .nodeWidth(14)
      .nodePadding(16)
      .extent([
        [1, 8],
        [WIDTH - LABEL_SPACE, height - 8],
      ]);
    // d3-sankey แก้ไข object ที่ส่งเข้าไป → ส่งสำเนา
    return generator({
      nodes: graph.nodes.map((node) => ({ ...node })),
      links: graph.links.map((link) => ({ ...link })),
    });
  }, [graph, height]);

  const linkPath = sankeyLinkHorizontal();

  return (
    <svg
      ref={ref}
      role="img"
      aria-label="แผนภาพการไหลของเงิน"
      viewBox={`0 0 ${WIDTH} ${height}`}
      width={WIDTH * zoom}
      height={height * zoom}
      className="block font-sans"
    >
      <g fill="none">
        {layout.links.map((link, index) => {
          const target = link.target as FlowNode;
          return (
            <path
              key={index}
              d={linkPath(link) ?? undefined}
              stroke={nodeColor(target)}
              strokeOpacity={0.3}
              strokeWidth={Math.max(1, link.width ?? 1)}
              className="transition-[stroke-opacity] hover:[stroke-opacity:0.55]"
            >
              <title>{`${(link.source as FlowNode).label} → ${target.label}: ${formatBaht(link.value)}`}</title>
            </path>
          );
        })}
      </g>

      {layout.nodes.map((node) => {
        const x0 = node.x0 ?? 0;
        const x1 = node.x1 ?? 0;
        const y0 = node.y0 ?? 0;
        const y1 = node.y1 ?? 0;
        const groupId = node.id.replace("group:", "");
        const collapsed = collapsedGroupIds.has(groupId);
        const value = valueText(node, labelMode);
        const toggle = node.collapsible ? () => onToggleGroup(groupId) : undefined;

        return (
          <g key={node.id} data-node-id={node.id}>
            <rect
              x={x0}
              y={y0}
              width={x1 - x0}
              height={Math.max(2, y1 - y0)}
              rx={3}
              fill={nodeColor(node)}
              className={toggle ? "cursor-pointer" : undefined}
              onClick={toggle}
              role={toggle ? "button" : undefined}
              tabIndex={toggle ? 0 : undefined}
              // ชื่อต้องไม่ซ้ำกับปุ่มยุบในฟอร์มรายจ่าย (screen reader จะแยกไม่ออก)
              aria-label={toggle ? `${collapsed ? "ขยาย" : "ยุบ"}ในผัง ${node.label}` : undefined}
              onKeyDown={toggle ? (event) => (event.key === "Enter" || event.key === " ") && toggle() : undefined}
            >
              <title>{`${node.label}: ${formatBaht(node.value)} (${node.percentOfIncome.toFixed(1)}%)`}</title>
            </rect>
            {/* ป้ายอยู่ขวาของโหนดเสมอ + ขอบสีขาว (halo) ให้อ่านออกเมื่อทับเส้น */}
            <text
              x={x1 + 6}
              y={(y0 + y1) / 2}
              dominantBaseline="middle"
              paintOrder="stroke"
              stroke="#ffffff"
              strokeWidth={4}
              strokeLinejoin="round"
              className={`fill-slate-700 text-[12px] ${toggle ? "cursor-pointer" : ""}`}
              onClick={toggle}
            >
              {node.collapsible ? `${collapsed ? "▸" : "▾"} ` : ""}
              {node.label}
              {value && <tspan className="fill-slate-500 font-semibold">{`  ${value}`}</tspan>}
            </text>
          </g>
        );
      })}
    </svg>
  );
});
