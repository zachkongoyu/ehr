"use client";
import { useLayoutEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/locale-shared";

export type MapState = "done" | "open" | "empty" | "context" | "alert";

export type MapNode = {
  id: string;
  label: string;
  detail?: string;
  state: MapState;
  onSelect: () => void;
};

export type MapColumn = {
  id: string;
  title: string;
  groups: { title?: string; nodes: MapNode[] }[];
};

/** [from node id, to node id, style] */
export type MapEdge = [string, string, "evidence" | "link" | "caution"];

type Path = { key: string; d: string; kind: MapEdge[2]; open: boolean };

// The consultation's reasoning drawn left to right. Nodes are ordinary
// buttons laid out in CSS columns; the connecting lines are measured from
// the rendered nodes so they follow wrapping text and screen size.
export function ConsultMap({
  locale, columns, edges,
}: {
  locale: Locale;
  columns: MapColumn[];
  edges: MapEdge[];
}) {
  const en = locale === "en";
  const frame = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<Path[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const signature = JSON.stringify([columns.map((column) => column.groups.map((group) =>
    group.nodes.map((node) => [node.id, node.label, node.detail, node.state]))), edges]);

  useLayoutEffect(() => {
    const root = frame.current;
    if (!root) return;
    const measure = () => {
      const box = root.getBoundingClientRect();
      const states = new Map<string, MapState>();
      columns.forEach((column) => column.groups.forEach((group) =>
        group.nodes.forEach((node) => states.set(node.id, node.state))));
      const point = (id: string, side: "left" | "right") => {
        const node = root.querySelector<HTMLElement>(`[data-node="${CSS.escape(id)}"]`);
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return {
          x: (side === "right" ? rect.right : rect.left) - box.left,
          y: rect.top + rect.height / 2 - box.top,
        };
      };
      setSize({ width: root.scrollWidth, height: root.scrollHeight });
      setPaths(edges.flatMap(([from, to, kind]) => {
        const a = point(from, "right");
        const b = point(to, "left");
        if (!a || !b) return [];
        const bend = Math.max(24, (b.x - a.x) / 2);
        return [{
          key: from + ">" + to,
          d: `M${a.x},${a.y} C${a.x + bend},${a.y} ${b.x - bend},${b.y} ${b.x},${b.y}`,
          kind,
          open: states.get(to) === "open" || states.get(to) === "empty",
        }];
      }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
    // The signature captures every value the drawing depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return (
    <section className="consult-map" aria-label={en ? "Consultation map" : "診症流程圖"}>
      <ul className="map-key" aria-label={en ? "Key" : "圖例"}>
        <li data-state="done">{en ? "Recorded" : "已記錄"}</li>
        <li data-state="open">{en ? "Still to ask or record" : "尚待查問或記錄"}</li>
        <li data-state="empty">{en ? "Not started" : "未開始"}</li>
        <li data-state="context">{en ? "From the chart" : "病歷資料"}</li>
      </ul>
      <div className="map-scroll">
        <div className="map-frame" ref={frame}>
          <svg className="map-lines" width={size.width} height={size.height} aria-hidden="true">
            {paths.map((path) => (
              <path key={path.key} d={path.d} data-kind={path.kind} data-open={path.open || undefined} />
            ))}
          </svg>
          {columns.map((column, index) => (
            <div key={column.id} className="map-column">
              <h3><span>{String(index + 1).padStart(2, "0")}</span>{column.title}</h3>
              {column.groups.map((group, groupIndex) => (
                <div key={groupIndex} className="map-group">
                  {group.title && <h4>{group.title}</h4>}
                  <ul>
                    {group.nodes.map((node) => (
                      <li key={node.id}>
                        <button type="button" className="map-node" data-node={node.id} data-state={node.state}
                          onClick={node.onSelect}>
                          <strong>{node.label}</strong>
                          {node.detail && <small>{node.detail}</small>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="map-note">
        {en ? "Lines show what each step is based on. Tap any item to open it in the note."
          : "連線表示每一步的依據。點選任何項目即可在病歷中開啟。"}
      </p>
    </section>
  );
}
