import { useRef, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import * as d3 from 'd3';
import type { GraphData, GraphNode } from '../utils/rdfGraphData';

interface SimNode extends GraphNode, d3.SimulationNodeDatum {}
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  label: string;
}

interface GraphPreviewProps {
  data: GraphData;
}

const IRI_FILL = '#e3f2fd';
const IRI_STROKE = '#1976d2';
const CLASS_FILL = '#e8f5e9';
const CLASS_STROKE = '#388e3c';
const LIT_FILL = '#fffde7';
const LIT_STROKE = '#f9a825';
const LINK_COLOR = '#9e9e9e';
const LABEL_COLOR = '#555';
const ELLIPSE_RX = 60;
const ELLIPSE_RY = 24;
const RECT_W = 130;
const RECT_H_BASE = 28;
const RECT_H_SUB = 40;
const BASE_LINK_DISTANCE = 140;
const CHAR_WIDTH = 6; // approximate px per character for label-based distance

const GraphPreview: React.FC<GraphPreviewProps> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);

  const render = useCallback(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    // Stop any previous simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
      simulationRef.current = null;
    }

    const root = d3.select(svg);
    root.selectAll('*').remove();
    root.attr('width', width).attr('height', height);

    if (data.nodes.length === 0) return;

    // Build simulation data (deep copy to avoid mutating props)
    const nodes: SimNode[] = data.nodes.map((n) => ({ ...n }));
    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    const links: SimLink[] = data.links
      .filter((l) => nodeById.has(l.source) && nodeById.has(l.target))
      .map((l) => ({
        source: l.source,
        target: l.target,
        label: l.label,
      }));

    // Arrowhead marker
    const defs = root.append('defs');
    defs
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L10,0L0,4')
      .attr('fill', LINK_COLOR);

    // Zoom group
    const g = root.append('g');
    root.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 4])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        }) as any
    );

    // Links — use <path> for textPath support
    const linkGroup = g
      .append('g')
      .selectAll('g')
      .data(links)
      .join('g');

    // Each link gets a unique path id for the textPath
    const linkPath = linkGroup
      .append('path')
      .attr('id', (_, i) => `link-path-${i}`)
      .attr('fill', 'none')
      .attr('stroke', LINK_COLOR)
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrowhead)');

    // Labels along the edge path
    linkGroup
      .append('text')
      .attr('font-size', '10px')
      .attr('fill', LABEL_COLOR)
      .attr('dy', -4)
      .append('textPath')
      .attr('href', (_, i) => `#link-path-${i}`)
      .attr('startOffset', '50%')
      .attr('text-anchor', 'middle')
      .text((d) => d.label);

    // Node groups
    const nodeGroup = g
      .append('g')
      .selectAll<SVGGElement, SimNode>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'grab');

    // IRI nodes — ellipses (class vs regular)
    nodeGroup
      .filter((d) => d.type === 'iri')
      .append('ellipse')
      .attr('rx', ELLIPSE_RX)
      .attr('ry', ELLIPSE_RY)
      .attr('fill', (d) => (d.isClass ? CLASS_FILL : IRI_FILL))
      .attr('stroke', (d) => (d.isClass ? CLASS_STROKE : IRI_STROKE))
      .attr('stroke-width', 1.5);

    nodeGroup
      .filter((d) => d.type === 'iri')
      .append('text')
      .text((d) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '11px')
      .attr('fill', '#333')
      .each(function () {
        const textEl = d3.select(this);
        const text = textEl.text();
        if (text.length > 16) {
          textEl.text(text.slice(0, 15) + '\u2026');
        }
      });

    // Literal nodes — rectangles
    nodeGroup
      .filter((d) => d.type === 'literal')
      .append('rect')
      .attr('width', RECT_W)
      .attr('height', (d) => (d.sublabel ? RECT_H_SUB : RECT_H_BASE))
      .attr('x', -RECT_W / 2)
      .attr('y', (d) => -(d.sublabel ? RECT_H_SUB : RECT_H_BASE) / 2)
      .attr('rx', 4)
      .attr('fill', LIT_FILL)
      .attr('stroke', LIT_STROKE)
      .attr('stroke-width', 1.5);

    nodeGroup
      .filter((d) => d.type === 'literal')
      .append('text')
      .text((d) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => (d.sublabel ? '-0.15em' : '0.35em'))
      .attr('font-size', '11px')
      .attr('fill', '#333')
      .each(function () {
        const textEl = d3.select(this);
        const text = textEl.text();
        if (text.length > 20) {
          textEl.text(text.slice(0, 19) + '\u2026');
        }
      });

    // Sublabel for literals (datatype / language)
    nodeGroup
      .filter((d) => d.type === 'literal' && !!d.sublabel)
      .append('text')
      .text((d) => d.sublabel!)
      .attr('text-anchor', 'middle')
      .attr('dy', '1.2em')
      .attr('font-size', '9px')
      .attr('fill', '#888');

    // Drag behavior
    const drag = d3
      .drag<SVGGElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeGroup.call(drag);

    // Force simulation with label-aware link distances
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((d) => {
            const labelPx = d.label.length * CHAR_WIDTH;
            return Math.max(BASE_LINK_DISTANCE, labelPx + 80);
          })
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(70))
      .on('tick', () => {
        // Update paths — ensure source→target direction so textPath reads left-to-right
        linkPath.attr('d', (d) => {
          const sx = (d.source as SimNode).x ?? 0;
          const sy = (d.source as SimNode).y ?? 0;
          const tx = (d.target as SimNode).x ?? 0;
          const ty = (d.target as SimNode).y ?? 0;
          const end = shortenToNode(sx, sy, tx, ty, d.target as SimNode);

          // Flip path direction if target is left of source so text stays upright
          if (sx <= tx) {
            return `M${sx},${sy}L${end.x},${end.y}`;
          } else {
            // Reverse: start from target side, end at source
            const startEnd = shortenToNode(tx, ty, sx, sy, d.source as SimNode);
            return `M${end.x},${end.y}L${startEnd.x},${startEnd.y}`;
          }
        });

        // For flipped paths, the arrowhead needs to move to the correct end
        linkPath.attr('marker-end', (d) => {
          const sx = (d.source as SimNode).x ?? 0;
          const tx = (d.target as SimNode).x ?? 0;
          return sx <= tx ? 'url(#arrowhead)' : 'none';
        });
        linkPath.attr('marker-start', (d) => {
          const sx = (d.source as SimNode).x ?? 0;
          const tx = (d.target as SimNode).x ?? 0;
          return sx > tx ? 'url(#arrowhead-reverse)' : 'none';
        });

        nodeGroup.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

    // Reverse arrowhead for flipped paths
    defs
      .append('marker')
      .attr('id', 'arrowhead-reverse')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 0)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto-start-reverse')
      .append('path')
      .attr('d', 'M0,-4L10,0L0,4')
      .attr('fill', LINK_COLOR);

    simulationRef.current = simulation;
  }, [data]);

  // Render on data change
  useEffect(() => {
    render();
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
    };
  }, [render]);

  // Resize observer — only re-render when actually visible
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let prevWidth = container.clientWidth;
    let prevHeight = container.clientHeight;
    const observer = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0 && (w !== prevWidth || h !== prevHeight)) {
        prevWidth = w;
        prevHeight = h;
        render();
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [render]);

  return (
    <Box
      ref={containerRef}
      sx={{ width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    </Box>
  );
};

/**
 * Shorten link endpoint to the boundary of the target node shape
 * so the arrowhead sits on the node edge, not behind it.
 */
function shortenToNode(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  target: SimNode
): { x: number; y: number } {
  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return { x: tx, y: ty };

  let offset: number;
  if (target.type === 'iri') {
    const angle = Math.atan2(dy, dx);
    const rx = ELLIPSE_RX;
    const ry = ELLIPSE_RY;
    offset = (rx * ry) / Math.sqrt((ry * Math.cos(angle)) ** 2 + (rx * Math.sin(angle)) ** 2);
  } else {
    const hw = RECT_W / 2;
    const hh = (target.sublabel ? RECT_H_SUB : RECT_H_BASE) / 2;
    const angle = Math.atan2(Math.abs(dy), Math.abs(dx));
    const rectAngle = Math.atan2(hh, hw);
    offset = angle < rectAngle ? hw / Math.cos(angle) : hh / Math.sin(angle);
  }

  const ratio = (dist - offset) / dist;
  return {
    x: sx + dx * ratio,
    y: sy + dy * ratio,
  };
}

export default GraphPreview;
