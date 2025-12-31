import React, { useState, useRef, useEffect } from 'react';
import { CreativeElement, CanvasFormat, CANVAS_FORMATS, ComplianceReport, ElementSubtype } from '../types';
import { geminiService } from '../services/geminiService';
import { IconMagic, IconCheck, IconAlert, IconImage, IconType, IconTrash } from './Icons';

interface ToolsProps {
  selectedElement: CreativeElement | undefined;
  format: CanvasFormat;
  elements: CreativeElement[];
  onAddElement: (type: 'text' | 'image' | 'shape', subtype?: ElementSubtype, config?: Partial<CreativeElement>) => void;
  onUpdateElement: (id: string, updates: Partial<CreativeElement>) => void;
  onDeleteElement: (id: string) => void;
  onUpdateFormat: (format: CanvasFormat) => void;
}

const BRAND_PALETTE = {
  tescoBlue: '#00539f',
  tescoRed: '#d6001c',
  clubcardYellow: '#ffdd00',
  black: '#000000',
  white: '#ffffff',
  slate: '#333333'
};

export const Tools: React.FC<ToolsProps> = ({ 
  selectedElement, format, elements, 
  onAddElement, onUpdateElement, onDeleteElement, onUpdateFormat 
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'design' | 'brand'>('create');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (selectedElement) {
      setActiveTab('design');
    }
  }, [selectedElement?.id]);

  // AI & Audit State
  const [productName, setProductName] = useState('');
  const [tone, setTone] = useState('Exciting');
  const [aiLoading, setAiLoading] = useState(false);
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [bgPrompt, setBgPrompt] = useState('');
  
  // Magic Build State
  const [magicInput, setMagicInput] = useState('');

  // --- HELPERS ---

  const isOverlapping = (r1: CreativeElement, r2: CreativeElement) => {
    return !(r2.x > r1.x + r1.width || 
             r2.x + r2.width < r1.x || 
             r2.y > r1.y + r1.height || 
             r2.y + r2.height < r1.y);
  };

  const handleLayerOrder = (direction: 'front' | 'back') => {
    if (!selectedElement) return;
    
    // Sort logic
    const sorted = [...elements].sort((a, b) => {
        const zA = a.style.zIndex || 0;
        const zB = b.style.zIndex || 0;
        if (zA !== zB) return zA - zB;
        return elements.indexOf(a) - elements.indexOf(b);
    });

    const currentIndex = sorted.findIndex(el => el.id === selectedElement.id);
    if (currentIndex === -1) return;
    const swapTargetIndex = direction === 'front' ? currentIndex + 1 : currentIndex - 1;
    if (swapTargetIndex < 0 || swapTargetIndex >= sorted.length) return;

    const targetEl = sorted[swapTargetIndex];
    if (targetEl.locked && (targetEl.style.zIndex === 0 || targetEl.id.includes('bg'))) return;

    const temp = sorted[currentIndex];
    sorted[currentIndex] = sorted[swapTargetIndex];
    sorted[swapTargetIndex] = temp;

    sorted.forEach((el, index) => {
        let newZ = (index + 1) * 10;
        if (el.locked && (el.style.zIndex === 0 || el.id.includes('bg'))) newZ = 0; 
        else if (newZ === 0) newZ = 10;
        if ((el.style.zIndex || 0) !== newZ) onUpdateElement(el.id, { style: { ...el.style, zIndex: newZ } });
    });
  };

  const handleGenerateCopy = async () => {
    if (!productName || !selectedElement || selectedElement.type !== 'text') return;
    setAiLoading(true);
    const copy = await geminiService.generateAdCopy(productName, tone, format.name);
    onUpdateElement(selectedElement.id, { content: copy });
    setAiLoading(false);
  };

  const handleMagicBuild = async () => {
    if (!magicInput) return;
    setAiLoading(true);
    
    // 1. Get Strategy (Headline + Visual Description)
    const strategy = await geminiService.generateCreativeStrategy(magicInput);
    if (!strategy) {
        setAiLoading(false);
        return;
    }

    // 2. Generate Background
    const imgData = await geminiService.generateBackground(strategy.backgroundPrompt);

    // 3. Update Elements
    if (imgData) {
        // Check for existing bg image, otherwise add new one
        const existingBg = elements.find(e => e.type === 'image' && e.width === format.width && !e.subtype?.includes('packshot'));
        if (existingBg) {
            onUpdateElement(existingBg.id, { content: imgData });
        } else {
             onAddElement('image', 'none', { 
                 content: imgData, 
                 width: format.width, height: format.height, 
                 x: 0, y: 0, 
                 style: { zIndex: 1 } 
             });
        }
    }

    // Update Headline
    const headline = elements.find(e => e.type === 'text' && (e.style.fontSize || 0) > 40 && !e.locked);
    if (headline) {
        onUpdateElement(headline.id, { content: strategy.headline });
    } else {
        onAddElement('text', 'none', { 
            content: strategy.headline, 
            x: 50, y: 100, 
            width: format.width - 100, 
            style: { color: BRAND_PALETTE.tescoBlue, fontSize: 80, fontWeight: '700' } 
        });
    }

    setAiLoading(false);
  };

  const handleGenerateBg = async () => {
    if (!bgPrompt) return;
    setAiLoading(true);
    const imgData = await geminiService.generateBackground(bgPrompt);
    if (imgData) {
      onAddElement('image', 'none', { content: imgData, width: format.width, height: format.height, x: 0, y: 0 });
    }
    setAiLoading(false);
  };

  // --- FULL AUDIT (Appendix A + B) ---
  const handleComplianceCheck = async () => {
    setAiLoading(true);
    const textElements = elements.filter(e => e.type === 'text');
    const textContent = textElements.map(e => e.content || '');
    
    // 1. AI SEMANTIC CHECK (Copy bans, claims, alcohol)
    const hasAlcohol = textContent.some(t => /wine|beer|spirit|alcohol|vodka|gin|whisky/i.test(t));
    let report = await geminiService.checkCompliance(textContent, hasAlcohol);

    const issues: string[] = [...report.issues];
    const suggestions: string[] = [...report.suggestions];
    let score = report.score;

    // 2. GEOMETRIC CHECK (Appendix B Strictness)

    // A. Collision Detection
    const protectedElements = elements.filter(e => 
        e.subtype?.includes('value-tile') || e.subtype?.includes('cta') || e.subtype?.includes('tag') || e.subtype?.includes('drinkaware')
    );
    
    elements.forEach(el => {
        if (protectedElements.includes(el)) return;
        if (el.type === 'shape' && el.width === format.width) return;
        if (el.type === 'image' && el.subtype !== 'packshot' && el.width === format.width) return; // BG image

        protectedElements.forEach(prot => {
            if (isOverlapping(el, prot)) {
                if (el.style.zIndex && prot.style.zIndex && el.style.zIndex > prot.style.zIndex) {
                    issues.push(`CRITICAL (Appx B): Element overlaps ${prot.subtype?.replace(/-/g, ' ')}. Content cannot overlay restricted zones.`);
                    score -= 20;
                }
            }
        });
    });

    // B. Safe Zones (9:16 specific)
    if (format.id === 'story') {
        elements.forEach(el => {
            if (el.type === 'shape' && el.width === format.width) return; // Ignore BG
            if (el.type === 'image' && el.width === format.width) return;
            if (el.y < 200) {
                issues.push(`Safe Zone (Appx A): Element enters top 200px restricted area.`);
                score -= 10;
            }
            if (el.y + el.height > format.height - 250) {
                issues.push(`Safe Zone (Appx A): Element enters bottom 250px restricted area.`);
                score -= 10;
            }
        });
    }

    // C. Font Size (Min 20px)
    textElements.forEach(el => {
        if ((el.style.fontSize || 0) < 20) {
            issues.push(`Accessibility (Appx B): Font size ${el.style.fontSize}px is below 20px minimum.`);
            score -= 5;
        }
    });

    // D. Packshot Rules (Appx B)
    const packshot = elements.find(e => e.subtype === 'packshot');
    const cta = elements.find(e => e.subtype?.includes('cta'));

    if (cta) {
        if (!packshot) {
            issues.push(`Design Fail: CTA present but no Packshot found.`);
            score -= 10;
        } else {
             // Rule: Packshot must be closest element to CTA
             const ctaCenter = { x: cta.x + cta.width/2, y: cta.y + cta.height/2 };
             const others = elements.filter(e => e.id !== cta.id && e.id !== packshot.id && e.type !== 'shape' && !e.locked);
             const packshotDist = Math.hypot((packshot.x + packshot.width/2) - ctaCenter.x, (packshot.y + packshot.height/2) - ctaCenter.y);
             
             const closerElement = others.find(e => {
                  const d = Math.hypot((e.x + e.width/2) - ctaCenter.x, (e.y + e.height/2) - ctaCenter.y);
                  return d < packshotDist;
             });

             if (closerElement) {
                  issues.push(`Design Fail (Appx B): Packshot must be the closest element to the CTA. Found '${closerElement.type}' closer.`);
                  score -= 15;
             }

             // Rule: Gap >= 24px
             const xGap = Math.max(0, cta.x - (packshot.x + packshot.width), packshot.x - (cta.x + cta.width));
             const yGap = Math.max(0, cta.y - (packshot.y + packshot.height), packshot.y - (cta.y + cta.height));
             const finalGap = Math.hypot(xGap, yGap);

             if (finalGap < 24) {
                  issues.push(`Design Fail (Appx B): Gap between Packshot and CTA is ${Math.round(finalGap)}px. Minimum required is 24px.`);
                  score -= 15;
             }
        }
    }

    // E. Alcohol Drinkaware Check
    if (hasAlcohol) {
        const drinkaware = elements.find(e => e.subtype === 'drinkaware');
        if (!drinkaware) {
            issues.push(`CRITICAL FAIL: Alcohol content detected but 'Drinkaware' lock-up is missing.`);
            score -= 30;
        } else {
            // Contrast Check (Mock: just check color)
            if (drinkaware.style.color !== 'black' && drinkaware.style.color !== 'white') {
                issues.push(`Drinkaware Fail: Must be all-black or all-white.`);
                score -= 10;
            }
            if ((drinkaware.height) < 20) {
                 issues.push(`Drinkaware Fail: Minimum height is 20px.`);
                 score -= 10;
            }
        }
    }

    // F. Clubcard Date Check
    const clubcardTile = elements.find(e => e.subtype === 'value-tile-clubcard');
    if (clubcardTile) {
        const hasDate = textContent.some(t => t.match(/Ends \d{2}\/\d{2}/i));
        const hasAppReq = textContent.some(t => t.match(/Clubcard\/app required/i));
        
        if (!hasDate) {
            issues.push(`Legal Fail: Clubcard tile present but no 'Ends DD/MM' date found in text.`);
            score -= 15;
        }
        if (!hasAppReq) {
            issues.push(`Legal Fail: Clubcard tile present but 'Clubcard/app required' text missing.`);
            score -= 15;
        }
    }

    report.issues = issues;
    report.suggestions = suggestions;
    report.score = Math.max(0, score);
    report.isCompliant = issues.length === 0;

    setComplianceReport(report);
    setAiLoading(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onAddElement('image', 'packshot', { content: result, width: 300, height: 300 });
      };
      reader.readAsDataURL(file);
    }
  };

  // --- APPENDIX A ASSET GENERATORS ---

  const addValueTile = (variant: 'clubcard' | 'new' | 'white') => {
    // Rule: "Position is predefined. It cannot be moved by user." -> locked: true
    const size = 250;
    const x = format.width - size - 40;
    const y = format.height - size - 40; 
    const topZ = Math.max(0, ...elements.map(e => e.style.zIndex || 0)) + 50;

    if (variant === 'clubcard') {
        // Clubcard: Yellow BG + "Clubcard Price" (Locked) + Price (Locked Position, Editable Content) + "Regular Price" (Locked Position, Editable Content)
        onAddElement('shape', 'value-tile-clubcard', { 
            width: size, height: size, x, y, 
            style: { backgroundColor: BRAND_PALETTE.clubcardYellow, zIndex: topZ }, 
            locked: true 
        });
        // Static Label
        onAddElement('text', 'none', { 
            content: 'Clubcard Price', 
            width: size, height: 40, x, y: y + 20, 
            style: { color: BRAND_PALETTE.tescoBlue, fontSize: 24, fontWeight: '700', textAlign: 'center', zIndex: topZ + 1 }, 
            locked: true 
        });
        // Editable Price (Offer) - LOCKED POSITION, EDITABLE TEXT
        onAddElement('text', 'none', { 
            content: '£3.50', 
            width: size, height: 60, x, y: y + 60, 
            style: { color: BRAND_PALETTE.tescoBlue, fontSize: 56, fontWeight: '800', textAlign: 'center', zIndex: topZ + 1 }, 
            locked: true 
        });
         // Editable Regular Price - LOCKED POSITION, EDITABLE TEXT
         onAddElement('text', 'none', { 
            content: 'Was £4.50', 
            width: size, height: 30, x, y: y + 130, 
            style: { color: BRAND_PALETTE.tescoBlue, fontSize: 18, fontWeight: '500', textAlign: 'center', zIndex: topZ + 1 }, 
            locked: true 
        });

    } else if (variant === 'new') {
        // New: Red Roundel + "NEW" (All locked)
        onAddElement('shape', 'value-tile-new', { width: size, height: size, x, y, style: { backgroundColor: BRAND_PALETTE.tescoRed, borderRadius: 999, zIndex: topZ }, locked: true });
        onAddElement('text', 'none', { content: 'NEW', width: size, height: size, x, y, style: { color: 'white', fontSize: 48, fontWeight: '700', textAlign: 'center', zIndex: topZ + 1 }, locked: true });
    
    } else {
        // White: White Roundel + Price (Editable)
        onAddElement('shape', 'value-tile-white', { width: size, height: size, x, y, style: { backgroundColor: 'white', borderRadius: 999, border: '2px solid #ccc', zIndex: topZ }, locked: true });
        onAddElement('text', 'none', { content: '£2.00', width: size, height: size, x, y, style: { color: BRAND_PALETTE.black, fontSize: 56, fontWeight: '700', textAlign: 'center', zIndex: topZ + 1 }, locked: true });
    }
  };

  const addTag = (variant: 'exclusive' | 'standard' | 'legal') => {
    if (variant === 'exclusive') {
        onAddElement('text', 'tag-exclusive', { content: 'Only at Tesco', style: { color: BRAND_PALETTE.slate, fontSize: 24, fontWeight: '600' } });
    } else if (variant === 'standard') {
        onAddElement('text', 'tag-standard', { content: 'Available at Tesco', style: { color: BRAND_PALETTE.slate, fontSize: 24, fontWeight: '600' } });
    } else {
        onAddElement('text', 'legal-text', { content: 'Selected stores. While stocks last. Clubcard/app required. Ends 01/01', width: format.width - 100, x: 50, y: format.height - 50, style: { color: '#666', fontSize: 14 } });
    }
  };

  const addDrinkaware = () => {
    // Rule: Black or White only. Min 20px height.
    onAddElement('text', 'drinkaware', { 
        content: 'Drinkaware.co.uk', 
        width: 300, height: 30, 
        x: 50, y: format.height - 100, 
        style: { color: 'black', fontSize: 20, fontWeight: '700', border: '1px solid black', textAlign: 'center' }
    });
  };

  const applyLEPTemplate = () => {
    // Remove existing CTA if present
    const cta = elements.find(e => e.subtype?.includes('cta'));
    if (cta) onDeleteElement(cta.id);

    const cx = format.width / 2;
    const cy = format.height / 2;
    
    // White BG
    onAddElement('shape', 'none', { width: format.width, height: format.height, x:0, y:0, style: { backgroundColor: '#ffffff', zIndex: 0}, locked: true });
    
    // Standard Text
    onAddElement('text', 'none', { content: 'LOW EVERYDAY PRICE', x: 50, y: 80, width: 800, height: 100, style: { color: BRAND_PALETTE.tescoBlue, fontSize: 80, fontWeight: '700', textAlign: 'left', zIndex: 10 } });
    
    // Packshot
    onAddElement('image', 'packshot', { content: 'https://picsum.photos/400/400', width: 400, height: 400, x: cx - 250, y: cy - 200, style: { zIndex: 5 } });
    
    // Logo Right of Packshot (Rule)
    onAddElement('shape', 'lep-logo', { width: 100, height: 100, x: cx + 160, y: cy - 100, style: { backgroundColor: BRAND_PALETTE.tescoBlue, borderRadius: 50, zIndex: 10 }, locked: false }); 
    
    addTag('legal');
  };

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col h-full shadow-2xl z-20 flex-shrink-0 transition-all duration-300">
      <div className="flex border-b border-slate-800 bg-slate-950">
        {['create', 'design', 'brand'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border-b-2 ${
              activeTab === tab 
              ? 'text-indigo-400 border-indigo-500 bg-slate-900' 
              : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
        {/* CREATE TAB */}
        {activeTab === 'create' && (
          <div className="space-y-6 animate-fadeIn">
            {/* MAGIC BUILDER SECTION - HACKATHON ADDITION */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-900/40 to-slate-800/40 border border-indigo-500/30 space-y-3 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><IconMagic /></div>
               <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block flex items-center gap-1.5">
                 <IconMagic /> Magic Creative Builder
               </label>
               <input 
                  type="text" 
                  placeholder="e.g. Tesco Finest Pizza, movie night" 
                  className="w-full bg-slate-950/80 border border-indigo-500/30 rounded-lg px-3 py-2 text-xs text-white placeholder-indigo-200/30 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  value={magicInput}
                  onChange={(e) => setMagicInput(e.target.value)}
                />
               <button 
                  onClick={handleMagicBuild}
                  disabled={aiLoading || !magicInput}
                  className="w-full p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-900/30 transition-all disabled:opacity-50 disabled:grayscale"
                >
                  {aiLoading ? 'Dreaming...' : 'Auto-Design Creative'}
               </button>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">1. Canvas Format</label>
              <div className="grid grid-cols-1 gap-2">
                {CANVAS_FORMATS.map(f => (
                  <button key={f.id} onClick={() => onUpdateFormat(f)} className={`flex items-center justify-between p-3 rounded-lg text-xs border transition-all ${format.id === f.id ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-500/50' : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:bg-slate-800'}`}>
                    <span className="font-medium">{f.name}</span>
                    <span className="opacity-50 font-mono text-[10px] bg-black/20 px-1.5 py-0.5 rounded">{f.width}x{f.height}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-3 pt-2 border-t border-slate-800">
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">✦ Smart Templates</label>
               <button onClick={applyLEPTemplate} className="w-full p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-all flex items-center justify-center gap-2">
                  Build "Low Everyday Price"
               </button>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">2. Appendix A Assets (Locked)</label>
              <div className="grid grid-cols-3 gap-2">
                 <button onClick={() => addValueTile('clubcard')} className="p-2 bg-yellow-400 hover:bg-yellow-300 text-blue-900 font-bold rounded text-[10px] text-center shadow-sm">
                    Clubcard
                 </button>
                 <button onClick={() => addValueTile('new')} className="p-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-[10px] text-center shadow-sm">
                    NEW Tile
                 </button>
                 <button onClick={() => addValueTile('white')} className="p-2 bg-white hover:bg-gray-100 text-black font-bold rounded text-[10px] text-center shadow-sm">
                    White Tile
                 </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                 <button onClick={() => addTag('exclusive')} className="p-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-[10px] rounded">"Only at Tesco"</button>
                 <button onClick={() => addTag('standard')} className="p-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-[10px] rounded">"Available at"</button>
                 <button onClick={() => addTag('legal')} className="col-span-2 p-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-[10px] rounded">Legal Tag (Stocks last)</button>
              </div>
              
              <div className="mt-2">
                 <button onClick={addDrinkaware} className="w-full p-2 bg-black hover:bg-gray-900 text-white text-[10px] font-bold uppercase tracking-wider rounded border border-slate-700">
                    + Drinkaware Lock-up
                 </button>
              </div>

               <button onClick={() => onAddElement('shape', 'cta-primary', { width: 250, height: 60, style: { backgroundColor: BRAND_PALETTE.tescoBlue, borderRadius: 30, color: 'white' }, content: 'Shop Now' })} className="w-full p-3 bg-blue-700 hover:bg-blue-600 text-white font-semibold rounded-lg text-xs transition-colors mt-2">
                    + CTA Button
               </button>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">3. Basic Elements</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => onAddElement('text', 'none')} className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 rounded-xl text-slate-300 transition-all group">
                  <div className="p-2 bg-slate-950 rounded-full group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors"><IconType /></div>
                  <span className="text-xs font-medium">Text</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 rounded-xl text-slate-300 transition-all group">
                  <div className="p-2 bg-slate-950 rounded-full group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors"><IconImage /></div>
                  <span className="text-xs font-medium">Upload</span>
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
              </div>
            </div>
          </div>
        )}

        {/* DESIGN TAB */}
        {activeTab === 'design' && (
          <div className="animate-fadeIn">
            {!selectedElement ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-4 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50">
                <div className="p-3 bg-slate-800 rounded-full animate-bounce"><IconType /></div>
                <p className="text-xs text-center max-w-[160px] leading-relaxed">Select an element on the canvas to edit its properties.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                  <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        {selectedElement.subtype !== 'none' ? selectedElement.subtype?.replace(/-/g, ' ').toUpperCase() : selectedElement.type.toUpperCase()}
                      </span>
                      {selectedElement.locked && <span className="text-[9px] text-amber-500 mt-0.5">⚠ Position Locked (Appendix A)</span>}
                  </div>
                  <button onClick={() => onDeleteElement(selectedElement.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Delete Element">
                    <IconTrash />
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Geometry {selectedElement.locked && '(Locked)'}</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['x', 'y', 'width', 'height'].map((prop) => (
                      <div key={prop} className="relative group">
                        <span className="absolute left-2.5 top-2 text-[9px] text-slate-500 uppercase font-bold group-focus-within:text-indigo-400">{prop}</span>
                        <input 
                          type="number" 
                          value={selectedElement[prop as keyof CreativeElement] as number} 
                          onChange={(e) => !selectedElement.locked && onUpdateElement(selectedElement.id, { [prop]: parseInt(e.target.value) || 0 })}
                          disabled={selectedElement.locked}
                          className={`w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-8 pr-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all text-right font-mono ${selectedElement.locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                {(selectedElement.type === 'text' || selectedElement.subtype?.includes('cta')) && (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Content</label>
                        <textarea 
                          value={selectedElement.content} 
                          onChange={(e) => onUpdateElement(selectedElement.id, { content: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:border-indigo-500 focus:outline-none h-24 resize-none leading-relaxed"
                          placeholder="Enter text..."
                        />
                      </div>
                      <div className="space-y-2">
                         <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Size</label>
                            <span className="text-[10px] font-mono text-indigo-400">{selectedElement.style.fontSize}px</span>
                         </div>
                         <input type="range" min="10" max="240" value={selectedElement.style.fontSize} onChange={(e) => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, fontSize: parseInt(e.target.value) } })} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400" />
                         {(selectedElement.style.fontSize || 0) < 20 && <p className="text-[9px] text-red-500 font-bold">⚠ Violation: Min font size is 20px</p>}
                      </div>
                       <div className="space-y-2 pt-2">
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Brand Palette</label>
                         <div className="flex gap-2">
                            {Object.values(BRAND_PALETTE).map(color => (
                                <button key={color} className="w-6 h-6 rounded-full border border-slate-700 shadow-sm" style={{ backgroundColor: color }} onClick={() => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, color: color } })} title={color} />
                            ))}
                         </div>
                       </div>
                    </div>
                )}
                 {(selectedElement.type === 'shape' || selectedElement.subtype?.includes('value-tile')) && (
                    <div className="space-y-3 pt-4 border-t border-slate-800">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fill Color</label>
                         <div className="flex gap-2">
                            {Object.values(BRAND_PALETTE).map(color => (
                                <button key={color} className="w-8 h-8 rounded-full border border-slate-700 shadow-sm" style={{ backgroundColor: color }} onClick={() => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, backgroundColor: color } })} title={color} />
                            ))}
                         </div>
                    </div>
                 )}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Arrangement</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleLayerOrder('back')} className="bg-slate-800 hover:bg-slate-700 py-2 rounded-lg text-xs text-slate-300 border border-slate-700 transition-colors">Move Back</button>
                    <button onClick={() => handleLayerOrder('front')} className="bg-slate-800 hover:bg-slate-700 py-2 rounded-lg text-xs text-slate-300 border border-slate-700 transition-colors">Move Front</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BRAND AI TAB */}
        {activeTab === 'brand' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-5 rounded-xl bg-slate-800/30 border border-slate-700 space-y-4">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400"><IconMagic /></div>
                <div><h3 className="text-xs font-bold uppercase tracking-wider text-white">AI Copywriter</h3></div>
              </div>
              <div className="space-y-3">
                <input type="text" placeholder="Product Name (e.g. Tesco Finest)" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none transition-colors" value={productName} onChange={(e) => setProductName(e.target.value)} />
                 <select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none">
                    <option>Exciting & Urgent</option>
                    <option>Premium & Sophisticated</option>
                    <option>Friendly & Helpful</option>
                    <option>Low Everyday Price (LEP)</option>
                </select>
                <button onClick={handleGenerateCopy} disabled={aiLoading || !selectedElement || selectedElement.type !== 'text'} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-bold text-xs transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:grayscale hover:shadow-indigo-500/30">{aiLoading ? 'Optimizing...' : 'Generate Compliant Copy'}</button>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-800/30 border border-slate-700 space-y-4">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400"><IconCheck /></div>
                <div><h3 className="text-xs font-bold uppercase tracking-wider text-white">Strict Compliance Auditor</h3><p className="text-[10px] text-slate-500">Checking Appendix A & B Rules</p></div>
              </div>
              <button onClick={handleComplianceCheck} disabled={aiLoading} className="w-full bg-emerald-700 hover:bg-emerald-600 text-white py-2.5 rounded-lg font-bold text-xs transition shadow-lg shadow-emerald-900/20 disabled:opacity-50 hover:shadow-emerald-500/20">{aiLoading ? 'Auditing...' : 'Run Full Audit'}</button>
            </div>

            {complianceReport && (
              <div className={`p-4 rounded-xl border animate-in slide-in-from-bottom-2 fade-in ${complianceReport.isCompliant ? 'bg-emerald-950/30 border-emerald-800' : 'bg-red-950/30 border-red-800'}`}>
                <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                   <span className={`text-sm font-bold ${complianceReport.isCompliant ? 'text-emerald-400' : 'text-red-400'}`}>{complianceReport.isCompliant ? 'PASSED' : 'VIOLATIONS FOUND'}</span>
                   <div className="flex items-center gap-2"><span className="text-[9px] uppercase text-slate-500 font-bold">Score</span><span className={`text-sm font-black ${complianceReport.score > 80 ? 'text-emerald-400' : 'text-red-400'}`}>{complianceReport.score}%</span></div>
                </div>
                {complianceReport.issues.length > 0 && (
                  <div className="mb-4 space-y-2">{complianceReport.issues.map((issue, i) => (<div key={i} className="flex gap-2 items-start p-2.5 rounded bg-black/20 border border-white/5"><span className="mt-0.5 text-red-400 shrink-0"><IconAlert /></span><span className="text-[11px] text-slate-300 leading-tight">{issue}</span></div>))}</div>
                )}
                 {complianceReport.suggestions.length > 0 && (
                  <div className="space-y-1.5"><p className="text-[10px] uppercase font-bold text-slate-500">Fixes</p><ul className="space-y-1">{complianceReport.suggestions.map((sug, i) => (<li key={i} className="text-[11px] text-slate-400 flex gap-2"><span className="text-emerald-500">•</span> {sug}</li>))}</ul></div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};