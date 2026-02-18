import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box } from '@mui/material';

interface ResizableSplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultLeftPercent?: number;
  minLeftPercent?: number;
  maxLeftPercent?: number;
}

const ResizableSplitPane: React.FC<ResizableSplitPaneProps> = ({
  left,
  right,
  defaultLeftPercent = 60,
  minLeftPercent = 30,
  maxLeftPercent = 80,
}) => {
  const [leftPercent, setLeftPercent] = useState(defaultLeftPercent);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      let pct = (x / rect.width) * 100;
      pct = Math.max(minLeftPercent, Math.min(maxLeftPercent, pct));
      setLeftPercent(pct);
    };

    const handleMouseUp = () => {
      dragging.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [minLeftPercent, maxLeftPercent]);

  return (
    <Box
      ref={containerRef}
      sx={{
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Left pane */}
      <Box
        sx={{
          width: `${leftPercent}%`,
          overflow: 'auto',
          pr: 0.5,
        }}
      >
        {left}
      </Box>

      {/* Drag handle */}
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          width: 6,
          cursor: 'col-resize',
          bgcolor: 'divider',
          flexShrink: 0,
          '&:hover': { bgcolor: 'primary.main', opacity: 0.5 },
          borderRadius: 1,
          mx: 0.5,
        }}
      />

      {/* Right pane */}
      <Box
        sx={{
          width: `${100 - leftPercent}%`,
          overflow: 'auto',
          pl: 0.5,
        }}
      >
        {right}
      </Box>
    </Box>
  );
};

export default ResizableSplitPane;
