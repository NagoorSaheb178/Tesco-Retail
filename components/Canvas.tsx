import React, { useRef, useState, useEffect } from 'react';
import { CreativeElement, CanvasFormat } from '../types';

interface CanvasProps {
  elements: CreativeElement[];
  selectedId: string | null;
  format: CanvasFormat;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<CreativeElement>) => void;
}

export const Canvas: React.FC<CanvasProps> = ({ elements, selectedId, format, onSelect, onUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [elementStart, setElementStart] = useState({ x: 0, y: 0 });
  const [showSafeZones, setShowSafeZones] = useState(true);

  // Calculate scale to fit in view
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const padding = 64;
        const availableWidth = width - padding;
        const availableHeight = height - padding;
        
        const scaleW = availableWidth / format.width;
        const scaleH = availableHeight / format.height;
        
        setScale(Math.min(scaleW, scaleH, 1)); // Max scale 1
      }
    };
    
    window.addEventListener('resize', updateScale);
    updateScale();
    return () => window.removeEventListener('resize', updateScale);
  }, [format]);

  const handleMouseDown = (e: React.MouseEvent, el: CreativeElement) => {
    e.preventDefault(); // Prevent text selection behavior
    e.stopPropagation();
    onSelect(el.id);
    if (!el.locked) {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        setElementStart({ x: el.x, y: el.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && selectedId) {
      const dx = (e.clientX - dragStart.x) / scale;
      const dy = (e.clientY - dragStart.y) / scale;
      
      onUpdate(selectedId, {
        x: Math.round(elementStart.x + dx),
        y: Math.round(elementStart.y + dy)
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 flex items-center justify-center bg-slate-950 overflow-hidden relative canvas-pattern select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div 
        className="bg-white shadow-2xl relative transition-transform duration-200 ease-out"
        style={{
          width: format.width,
          height: format.height,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          boxShadow: '0 0 100px -20px rgba(0, 0, 0, 0.7)'
        }}
        onClick={() => onSelect('')} // Deselect when clicking background
      >
        {/* Safe Zones Layer (Appendix A) - Only for Story format */}
        {showSafeZones && format.id === 'story' && (
             <div className="absolute inset-0 pointer-events-none z-50">
                {/* Top Safe Zone: 200px */}
                <div className="absolute top-0 w-full h-[200px] border-b border-dashed border-red-500/40 bg-red-500/5 flex items-end justify-center">
                    <span className="text-[9px] text-red-500/70 font-mono font-bold uppercase tracking-widest mb-1">Safe Zone (Top 200px)</span>
                </div>
                {/* Bottom Safe Zone: 250px */}
                <div className="absolute bottom-0 w-full h-[250px] border-t border-dashed border-red-500/40 bg-red-500/5 flex items-start justify-center">
                    <span className="text-[9px] text-red-500/70 font-mono font-bold uppercase tracking-widest mt-1">Safe Zone (Bottom 250px)</span>
                </div>
             </div>
        )}

        {/* Render Elements */}
        {elements.map((el) => {
          const isSelected = el.id === selectedId;
          const isValueTile = el.subtype?.includes('value-tile');
          const isRestricted = el.subtype !== 'none';
          
          return (
            <div
              key={el.id}
              onMouseDown={(e) => handleMouseDown(e, el)}
              onClick={(e) => e.stopPropagation()} 
              style={{
                position: 'absolute',
                left: el.x,
                top: el.y,
                width: el.width,
                height: el.height,
                zIndex: el.style.zIndex || 1,
                transform: `rotate(${el.style.rotation || 0}deg)`,
                backgroundColor: el.style.backgroundColor,
                color: el.style.color,
                fontSize: `${el.style.fontSize}px`,
                fontWeight: el.style.fontWeight,
                fontFamily: el.style.fontFamily,
                borderRadius: el.style.borderRadius,
                opacity: el.style.opacity ?? 1,
                cursor: el.locked ? 'not-allowed' : (isDragging && isSelected ? 'grabbing' : 'grab'),
                border: el.style.border,
                ...el.type === 'text' ? { display: 'flex', alignItems: 'center', justifyContent: el.style.textAlign || 'center', whiteSpace: 'pre-wrap' } : {},
                ...el.type === 'image' ? { backgroundImage: `url(${el.content})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {},
                ...(el.locked ? { boxShadow: 'inset 0 0 0 2px rgba(239, 68, 68, 0.4)' } : {})
              }}
              className={`transition-shadow duration-150 ${!el.locked ? 'hover:ring-2 hover:ring-indigo-400/50' : ''} ${isSelected ? 'ring-2 ring-indigo-500 shadow-xl shadow-indigo-500/20' : ''}`}
            >
              {el.type === 'text' && (
                <span className="w-full pointer-events-none px-1" style={{ lineHeight: 1.1 }}>{el.content}</span>
              )}
              
              {/* Asset Type Indicator */}
              {isRestricted && (
                  <div className={`absolute -top-3 right-0 text-white text-[7px] font-black tracking-tighter px-1 rounded-sm shadow-sm uppercase pointer-events-none ${el.locked ? 'bg-red-500' : 'bg-slate-500'}`}>
                      {el.subtype?.replace(/-/g, ' ')}
                  </div>
              )}

              {/* Selection HUD */}
              {isSelected && !el.locked && (
                <div className="absolute -top-8 left-0 flex items-center gap-1 pointer-events-none z-[100]">
                    <div className="bg-indigo-600 text-white text-[9px] font-mono px-2 py-1 rounded-md shadow-lg flex items-center gap-2">
                        <span>X: {el.x}</span>
                        <span className="w-px h-3 bg-white/20"></span>
                        <span>Y: {el.y}</span>
                    </div>
                </div>
              )}
              
              {isSelected && el.locked && (
                 <div className="absolute -top-8 left-0 bg-red-600/90 backdrop-blur text-white text-[9px] font-bold tracking-wider uppercase px-2 py-1 rounded-md shadow-lg z-[100] flex items-center gap-1">
                   <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                   <span>Locked (Appx A)</span>
                 </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Footer Info */}
      <div className="absolute bottom-6 right-6 flex items-center gap-4 pointer-events-auto">
        {format.id === 'story' && (
             <button 
                onClick={() => setShowSafeZones(!showSafeZones)}
                className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg border backdrop-blur-sm transition-all ${showSafeZones ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/50 hover:bg-indigo-500/30' : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:bg-slate-800'}`}
             >
                {showSafeZones ? 'Hide Safe Zones' : 'Show Safe Zones'}
             </button>
        )}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-700 text-slate-400 text-[10px] font-mono px-3 py-1.5 rounded-full shadow-lg">
           {format.width} <span className="text-slate-600">x</span> {format.height}
        </div>
      </div>
    </div>
  );
};