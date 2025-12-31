import React, { useState } from 'react';
import { Canvas } from './components/Canvas';
import { Tools } from './components/Tools';
import { CreativeElement, CanvasFormat, CANVAS_FORMATS, ElementSubtype } from './types';
import { IconDownload } from './components/Icons';

declare global {
  interface Window {
    html2canvas: any;
  }
}

// Initial Template: Low Everyday Price (LEP) Style
const INITIAL_ELEMENTS: CreativeElement[] = [
  {
    id: 'bg-1',
    type: 'shape',
    subtype: 'none',
    x: 0,
    y: 0,
    width: 1080,
    height: 1080,
    style: { backgroundColor: '#ffffff', zIndex: 0 }, // White BG mandated by LEP
    locked: true
  },
  {
    id: 'text-1',
    type: 'text',
    subtype: 'none',
    x: 50,
    y: 100,
    width: 980,
    height: 140,
    content: 'SUMMER SAVINGS',
    style: { color: '#00539f', fontSize: 100, fontWeight: '700', fontFamily: 'Inter', zIndex: 10, textAlign: 'left' },
  },
  {
    id: 'packshot-1',
    type: 'image',
    subtype: 'packshot',
    x: 340,
    y: 300,
    width: 400,
    height: 400,
    content: 'https://picsum.photos/400/400?random=101',
    style: { zIndex: 5 }
  },
  {
    id: 'tile-clubcard',
    type: 'shape',
    subtype: 'value-tile-clubcard',
    x: 750,
    y: 750,
    width: 250,
    height: 250,
    style: { backgroundColor: '#ffdd00', color: '#000000', zIndex: 20 },
    locked: true
  },
  {
    id: 'text-clubcard-label',
    type: 'text',
    subtype: 'none',
    x: 750,
    y: 770,
    width: 250,
    height: 40,
    content: 'Clubcard Price',
    style: { color: '#00539f', fontSize: 24, fontWeight: '700', fontFamily: 'Inter', zIndex: 21, textAlign: 'center' },
    locked: true
  },
  {
    id: 'text-price-offer',
    type: 'text',
    subtype: 'none',
    x: 750,
    y: 810,
    width: 250,
    height: 60,
    content: '£3.50',
    style: { color: '#00539f', fontSize: 56, fontWeight: '800', fontFamily: 'Inter', zIndex: 21, textAlign: 'center' },
    locked: true // Locked position, but content editable via sidebar
  },
   {
    id: 'text-price-reg',
    type: 'text',
    subtype: 'none',
    x: 750,
    y: 880,
    width: 250,
    height: 30,
    content: 'Was £4.50',
    style: { color: '#00539f', fontSize: 18, fontWeight: '500', fontFamily: 'Inter', zIndex: 21, textAlign: 'center' },
    locked: true // Locked position
  },
  {
    id: 'text-legal',
    type: 'text',
    subtype: 'legal-text',
    x: 50,
    y: 1020,
    width: 980,
    height: 40,
    content: 'Selected stores. While stocks last. Clubcard/app required. Ends 01/01',
    style: { color: '#666666', fontSize: 20, fontWeight: '400', fontFamily: 'Inter', zIndex: 10 },
  }
];

export default function App() {
  const [elements, setElements] = useState<CreativeElement[]>(INITIAL_ELEMENTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [format, setFormat] = useState<CanvasFormat>(CANVAS_FORMATS[0]);
  const [retailMode, setRetailMode] = useState<'standard' | 'lep'>('lep');

  const selectedElement = elements.find(el => el.id === selectedId);

  const handleUpdateElement = (id: string, updates: Partial<CreativeElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const handleAddElement = (type: 'text' | 'image' | 'shape', subtype: ElementSubtype = 'none', config?: Partial<CreativeElement>) => {
    const newId = `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate top zIndex
    const maxZ = Math.max(0, ...elements.map(e => e.style.zIndex || 0));

    // Default config based on type
    const newEl: CreativeElement = {
      id: newId,
      type,
      subtype,
      x: config?.x ?? (format.width / 2 - 150),
      y: config?.y ?? (format.height / 2 - 50),
      width: config?.width ?? 300,
      height: config?.height ?? 100,
      content: config?.content || (type === 'text' ? 'New Element' : undefined),
      style: {
        backgroundColor: config?.style?.backgroundColor,
        color: config?.style?.color || '#000000',
        fontSize: config?.style?.fontSize || 48,
        fontWeight: config?.style?.fontWeight || '400',
        zIndex: maxZ + 10, // Ensure it's comfortably on top
        ...config?.style
      },
      locked: config?.locked || false
    };
    
    setElements([...elements, newEl]);
    setSelectedId(newId);
  };

  const handleDeleteElement = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  };
  
  const handleDownloadImage = async (type: 'png' | 'jpeg') => {
    setSelectedId(null); // Deselect to remove HUD
    // Wait for render cycle
    setTimeout(async () => {
        const canvasElement = document.querySelector('.bg-white.shadow-2xl') as HTMLElement;
        if (canvasElement && window.html2canvas) {
            try {
                const canvas = await window.html2canvas(canvasElement, {
                    scale: 2, // High res
                    useCORS: true,
                    backgroundColor: null
                });
                
                const link = document.createElement('a');
                link.download = `creative_asset_${retailMode}_${format.id}.${type}`;
                link.href = canvas.toDataURL(`image/${type}`, 0.9);
                link.click();
            } catch (err) {
                console.error("Export failed", err);
                alert("Could not export image. Check console.");
            }
        } else {
            alert("Export library not ready.");
        }
    }, 100);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-6 z-30 shadow-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
            <span className="text-xl">R</span>
          </div>
          <div>
             <h1 className="font-bold text-lg leading-tight text-white tracking-tight">RetailGenius <span className="text-indigo-400">AI</span></h1>
             <p className="text-[10px] text-slate-500 font-medium tracking-wide">COMPLIANCE STUDIO</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-3">
             <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button 
                  onClick={() => setRetailMode('standard')}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${retailMode === 'standard' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Standard
                </button>
                <button 
                  onClick={() => setRetailMode('lep')}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${retailMode === 'lep' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Low Price (LEP)
                </button>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
                onClick={() => handleDownloadImage('jpeg')}
                className="flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-50 transition shadow-lg shadow-white/5 active:transform active:scale-95"
            >
                <IconDownload /> Export JPG
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Canvas Area */}
        <Canvas 
          elements={elements} 
          selectedId={selectedId} 
          format={format}
          onSelect={setSelectedId}
          onUpdate={handleUpdateElement}
        />

        {/* Right Sidebar (Tools & AI) */}
        <Tools 
          selectedElement={selectedElement}
          elements={elements}
          format={format}
          onAddElement={handleAddElement}
          onUpdateElement={handleUpdateElement}
          onDeleteElement={handleDeleteElement}
          onUpdateFormat={(f) => {
             setFormat(f);
             // Robustly find any background (Z-index 0 and matching previous dimensions)
             const bg = elements.find(e => (e.id.includes('bg') || e.style.zIndex === 0) && e.locked);
             if(bg) handleUpdateElement(bg.id, { width: f.width, height: f.height });
          }}
        />
      </div>
    </div>
  );
}