export type ElementType = 'text' | 'image' | 'shape' | 'group';

// Subtypes help identifying specific retail assets for Appendix A/B validation
export type ElementSubtype = 
  | 'none' 
  | 'value-tile-clubcard' 
  | 'value-tile-new' 
  | 'value-tile-white'
  | 'cta-primary' 
  | 'legal-text' 
  | 'tag-exclusive'
  | 'tag-standard'
  | 'logo' 
  | 'lep-logo'
  | 'packshot'
  | 'drinkaware';

export interface CreativeElement {
  id: string;
  type: ElementType;
  subtype?: ElementSubtype;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string; // Text content or Image URL
  locked?: boolean; // If true, position is fixed (Appendix A requirement for Value Tiles)
  style: {
    backgroundColor?: string;
    color?: string;
    fontSize?: number;
    fontWeight?: string;
    fontFamily?: string;
    borderRadius?: number;
    opacity?: number;
    zIndex?: number;
    rotation?: number;
    border?: string;
    textAlign?: 'left' | 'center' | 'right';
  };
}

export interface CanvasFormat {
  id: string;
  name: string;
  width: number;
  height: number;
  ratio: string;
}

export interface ComplianceReport {
  isCompliant: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
}

export const CANVAS_FORMATS: CanvasFormat[] = [
  { id: 'sq', name: 'Social Square', width: 1080, height: 1080, ratio: '1:1' },
  { id: 'story', name: 'Social Story', width: 1080, height: 1920, ratio: '9:16' },
  { id: 'landscape', name: 'Display Banner', width: 1200, height: 628, ratio: '1.91:1' },
];

export const RETAILER_RULES = `
STRICT COMPLIANCE AUDIT (APPENDIX A & B):

1. LOW EVERYDAY PRICE (LEP) RULES:
   - Background MUST be White.
   - Font MUST be Tesco Modern/Standard.
   - Text Color: Tesco Blue (#00539f).
   - Logo: Right of packshot.
   - Tag Required: "Selected stores. While stocks last."

2. VALUE TILES (STRICT):
   - Types: New, White, Clubcard.
   - Position: Predefined (cannot overlay other content).
   - Clubcard Tile: Flat design. Yellow/Blue.
   - Price Logic: Must show Offer Price and Regular Price.
   - Dates: Must include "Ends DD/MM".

3. COPY BANS (HARD FAIL):
   - NO "Money-back guarantees".
   - NO "Best", "#1", or Survey claims.
   - NO Green/Sustainability claims.
   - NO Charity partnerships.
   - NO Competitions.
   - NO Price call-outs in body text (Prices belong in Value Tiles ONLY).

4. SAFE ZONES (9:16):
   - Top 200px: CLEAR of text/logos.
   - Bottom 250px: CLEAR of text/logos.

5. ALCOHOL:
   - "Drinkaware" lock-up REQUIRED (Black/White only, Min height 20px).

6. ACCESSIBILITY:
   - WCAG AA Contrast required.
   - Min font size 20px (Brand).
`;