import { ComplianceReport } from "../types";

// Declare Puter global
declare const puter: any;

export const geminiService = {
  /**
   * Generates a cohesive creative strategy (Headline + Visual Description)
   * based on the product and context.
   */
  generateCreativeStrategy: async (input: string): Promise<{ headline: string; backgroundPrompt: string } | null> => {
    try {
      const prompt = `
        Role: Retail Creative Director.
        Context: User wants an ad for: "${input}".
        
        Task:
        1. Write a high-impact, compliant headline (Max 6 words).
           - NO "Best", "Money-back", "#1", or false claims.
           - Tone: Engaging and commercial.
        2. Describe a background image scene.
           - Style: Minimalist, high-end commercial photography.
           - Lighting: Soft, studio lighting.
           - Composition: Lots of negative space (white/light colors) for text overlay.
           - Content: Abstract or contextual to the product (e.g., kitchen counter for food), but NOT cluttering.
        
        Output valid JSON only. Format:
        {
          "headline": "string",
          "backgroundPrompt": "string"
        }
      `;

      // using Puter AI Chat with fast model
      const response = await puter.ai.chat(prompt, { model: 'gpt-4o-mini' });
      let text = response?.message?.content || response || "";

      // Cleanup markdown code blocks if present
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      return JSON.parse(text);
    } catch (error) {
      console.error("Puter Strategy Error:", error);
      return null;
    }
  },

  /**
   * Generates ad copy based on product and tone.
   */
  generateAdCopy: async (productName: string, tone: string, format: string): Promise<string> => {
    try {
      const prompt = `
        Product: "${productName}"
        Tone: ${tone}
        Ad Format: ${format}
        
        Task: Write a single, high-impact headline for a retail media banner.
        
        CRITICAL APPENDIX B RESTRICTIONS (HARD FAIL IF VIOLATED):
        - DO NOT use "Money-back guarantee".
        - DO NOT use unsubstantiated claims like "Best", "#1", or quote surveys.
        - DO NOT use Green/Sustainability claims (e.g. "Eco-friendly").
        - DO NOT mention charity partnerships.
        - DO NOT run competitions ("Win", "Enter now").
        - DO NOT include Price Call-outs in the headline (e.g. "Only £5"). Prices belong in Value Tiles only.
        
        Constraints:
        - Max 8 words.
        - No exclamation marks unless tone is "Exciting".
        - British English spelling.
        - Output ONLY the text.
      `;

      const response = await puter.ai.chat(prompt, { model: 'gpt-4o-mini' });
      const text = response?.message?.content || response || "";

      return text ? text.replace(/"/g, '').trim() : "Special Offer";
    } catch (error) {
      console.error("Puter Copy Error:", error);
      return "Special Offer Available Now";
    }
  },

  /**
   * Checks the current text content against retailer compliance rules.
   */
  checkCompliance: async (textElements: string[], hasAlcohol: boolean): Promise<ComplianceReport> => {
    try {
      const prompt = `
        Role: Senior Retail Compliance Auditor.
        Task: Audit the following text content from a digital ad creative against strict Retail Media Guidelines (Appendix A & B).
        
        Content Found: ${JSON.stringify(textElements)}
        Context: Alcohol Product Present = ${hasAlcohol}
        
        STRICT AUDIT RULES (HARD FAILS):
        
        1. COPY BANS (Zero Tolerance - Flag as Issues):
           - Money-back guarantees?
           - Competitions (e.g. "Win", "Prize")?
           - Sustainability claims (e.g. "Green", "Eco", "Sustainable")?
           - Charity partnerships?
           - Price call-outs in body text (e.g. "£5", "$10")?
           - Superlative claims like "Best", "#1", "Voted"?
        
        2. MANDATORY TAGS (Exact Match Required - Flag if Missing):
           - "Selected stores. While stocks last." (Required on all)
           - If a "Clubcard" mention exists: Must include "Ends DD/MM" (Date format).
           - If Alcohol: Must include "Drinkaware.co.uk" or similar lock-up text.
        
        3. EXCLUSIVITY:
           - Check for "Only at Tesco" vs "Available at Tesco". (Informational).

        Output valid JSON only. Format:
        {
          "isCompliant": boolean,
          "score": integer (0-100),
          "issues": string[] (list specific violations),
          "suggestions": string[] (specific fixes)
        }
      `;

      const response = await puter.ai.chat(prompt, { model: 'gpt-4o-mini' });
      let text = response?.message?.content || response || "";

      // Cleanup markdown code blocks if present
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      const json = JSON.parse(text);
      return json as ComplianceReport;

    } catch (error) {
      console.error("Puter Compliance Error:", error);
      return {
        isCompliant: false,
        score: 0,
        issues: ["AI Service Error: Could not validate."],
        suggestions: ["Please check internet connection and Puter service."]
      };
    }
  },

  /**
   * Generates a background image.
   */
  generateBackground: async (description: string): Promise<string | null> => {
    try {
      const prompt = `
        High-end retail product advertising background. 
        Scene: ${description}.
        Style: Minimalist, commercial photography, soft studio lighting, 8k resolution, ultra-sharp focus, high fidelity.
        Constraint: Use white/light background suitable for retail overlay text.
        No text, no watermarks.
      `;

      // Using gpt-image-1-mini for fast generation
      const imageElement = await puter.ai.txt2img(prompt, {
        model: 'gpt-image-1-mini'
      });

      // Puter txt2img returns an HTMLImageElement
      if (imageElement && imageElement.src) {
        return imageElement.src;
      }
      return null;
    } catch (error) {
      console.error("Puter Image Error:", error);
      return null;
    }
  }
};
