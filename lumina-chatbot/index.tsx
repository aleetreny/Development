import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import { Send, Loader2, ShoppingBag, Sparkles, Leaf, RefreshCcw, ChevronDown, Search, Tag } from 'lucide-react';
import { PRODUCT_CATALOG, GEMINI_MODEL_NAME, SYSTEM_INSTRUCTION } from './constants';
import { ChatMessage, Product, ExtractedAttributes } from './types';

// --- Initialization ---
// Ensure API_KEY is available in your environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Logic Components ---

// 1. Gemini Call with History
const callGeminiForProductQuery = async (lastMessageText: string, history: ChatMessage[]): Promise<ExtractedAttributes | null> => {
  try {
    // Format history for Gemini: Filter out loading/error states and map to API structure
    const conversationContent = history
        .filter(msg => !msg.isLoading && msg.text) 
        .map(msg => {
            let text = msg.text;
            // INJECT METADATA: If the message has a product, append its details so Gemini can "see" it.
            if (msg.product) {
                text += `\n\n[METADATA_PRODUCTO_ANTERIOR: ID=${msg.product.id}, Categoría=${msg.product.category}, Precio=${msg.product.price}, Color=${msg.product.color}, Material=${msg.product.material}, Estilo=${msg.product.style}, Ocasión=${msg.product.occasion}, Fit=${msg.product.fit}, Género=${msg.product.gender}]`;
            }
            return {
                role: msg.sender === 'bot' ? 'model' : 'user',
                parts: [{ text: text }]
            };
        });

    // Add the new user message to the sequence
    conversationContent.push({
        role: 'user',
        parts: [{ text: lastMessageText }]
    });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: conversationContent,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bot_response: { type: Type.STRING },
            search_intent: { type: Type.BOOLEAN },
            category: { type: Type.STRING, nullable: true },
            color: { type: Type.STRING, nullable: true },
            material: { type: Type.STRING, nullable: true },
            occasion: { type: Type.STRING, nullable: true },
            fit: { type: Type.STRING, nullable: true },
            style: { type: Type.STRING, nullable: true },
            gender: { type: Type.STRING, nullable: true },
            is_cheap: { type: Type.BOOLEAN },
            is_expensive: { type: Type.BOOLEAN },
            is_surprise: { type: Type.BOOLEAN },
            is_accenture_special: { type: Type.BOOLEAN },
          },
          required: ["bot_response", "search_intent", "is_cheap", "is_surprise"],
        },
      },
    });
    
    if (response.text) {
      return JSON.parse(response.text) as ExtractedAttributes;
    }
    return null;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};

// 2. Advanced Weighted Scoring Logic
const calculateScore = (product: Product, extracted: ExtractedAttributes): number => {
  let score = 0;
  
  // Helpers for fuzzy matching
  const pCat = product.category.toLowerCase();
  const eCat = extracted.category?.toLowerCase();
  
  const pColor = product.color.toLowerCase();
  const eColor = extracted.color?.toLowerCase();
  
  const pMat = product.material.toLowerCase();
  const eMat = extracted.material?.toLowerCase();
  
  const pOcc = product.occasion.toLowerCase();
  const eOcc = extracted.occasion?.toLowerCase();

  // --- BASE SCORING ---

  // Category is the anchor (Base: 20 points)
  const categoryMatch = eCat && pCat.includes(eCat);
  if (categoryMatch) {
    score += 20;
  }

  // Attributes (Base: 10 points each)
  const colorMatch = eColor && pColor === eColor;
  if (colorMatch) score += 10;

  const materialMatch = eMat && pMat === eMat;
  if (materialMatch) score += 10;

  const occasionMatch = eOcc && pOcc === eOcc;
  if (occasionMatch) score += 10;

  // Gender Filter -> Already handled by strict filter, but used for sorting tie-breaks
  if (extracted.gender && product.gender.toLowerCase() === extracted.gender.toLowerCase()) score += 15;

  // Style & Fit (Fine tuning, Base: 5 points)
  if (extracted.fit && product.fit.toLowerCase() === extracted.fit.toLowerCase()) score += 5;
  if (extracted.style && product.style.toLowerCase() === extracted.style.toLowerCase()) score += 5;

  // --- SYNERGY BONUSES (The "Both" Factor) ---
  // Prioritize items that match BOTH category and an attribute over items that just match category.
  if (categoryMatch && colorMatch) score += 30;
  if (categoryMatch && materialMatch) score += 20;
  if (categoryMatch && occasionMatch) score += 20;
  
  // Extra penalty for wrong color if color was explicitly requested (Soft Filter)
  if (eColor && !colorMatch && score > 0) score -= 5;

  return score;
};

interface SearchResult {
    product: Product;
    isRepeated: boolean;
}

const findProduct = (extracted: ExtractedAttributes, isEcoFilterActive: boolean, lastProductId?: number): SearchResult => {
  
  // 0. ACCENTURE SPECIAL BYPASS
  if (extracted.is_accenture_special) {
    const accentureShirt = PRODUCT_CATALOG.find(p => p.id === 99999);
    if (accentureShirt) {
        return { product: accentureShirt, isRepeated: false };
    }
  }

  // 1. Base Candidates
  let candidates = [...PRODUCT_CATALOG];

  // STRICT GENDER FILTER
  if (extracted.gender) {
      const requestedGender = extracted.gender.toLowerCase();
      // Filter candidates strictly by gender, allow 'Unisex' or 'Otro' if specific gender not found if needed, 
      // but strict request usually means strict filter.
      // We allow "Otro" (often Unisex in this dataset) to match anything if needed, but strict matching is safer for "Hombre"/"Mujer".
      const genderFiltered = candidates.filter(p => {
          const g = p.gender.toLowerCase();
          return g === requestedGender || g === 'unisex' || g === 'otro';
      });
      
      // Only apply if we actually have products for that gender
      if (genderFiltered.length > 0) {
          candidates = genderFiltered;
      }
  }

  // STRICT CATEGORY FILTER (Prevent Pants when asking for Shirt)
  // Only apply if category is clearly defined
  if (extracted.category) {
      const reqCat = extracted.category.toLowerCase();
      const categoryFiltered = candidates.filter(p => p.category.toLowerCase().includes(reqCat));
      // If we have matches for this category, restrict the pool to it.
      // This prevents a "Red Pants" result for a "Red Shirt" query just because color score was high.
      if (categoryFiltered.length > 0) {
          candidates = categoryFiltered;
      }
  }
  
  // Apply Eco Filter
  if (isEcoFilterActive) {
    const ecoCandidates = candidates.filter(p => p.sustainable);
    if (ecoCandidates.length > 0) {
      candidates = ecoCandidates;
    }
  }

  // 2. Handle "Surprise Me"
  if (extracted.is_surprise) {
    // Filter out the last product to ensure surprise is at least different if possible
    const filteredCandidates = lastProductId ? candidates.filter(p => p.id !== lastProductId) : candidates;
    const pool = filteredCandidates.length > 0 ? filteredCandidates : candidates;
    
    const randomIndex = Math.floor(Math.random() * pool.length);
    return { product: pool[randomIndex], isRepeated: false };
  }

  // 3. Score all candidates
  const scoredCandidates = candidates.map(product => ({
    product,
    score: calculateScore(product, extracted)
  }));

  // 4. Sort by Relevance (Highest Score first)
  scoredCandidates.sort((a, b) => b.score - a.score);

  // 5. Handle "Cheapest" / "Expensive" intent
  if (extracted.is_cheap) {
    const threshold = scoredCandidates[0].score > 0 ? scoredCandidates[0].score * 0.5 : 0;
    const relevantCandidates = scoredCandidates.filter(c => c.score >= threshold);
    relevantCandidates.sort((a, b) => a.product.price - b.product.price); // Ascending
    
    if (relevantCandidates.length > 0) {
        const best = relevantCandidates[0].product;
        return { product: best, isRepeated: best.id === lastProductId };
    }
  }

  if (extracted.is_expensive) {
    const threshold = scoredCandidates[0].score > 0 ? scoredCandidates[0].score * 0.5 : 0;
    const relevantCandidates = scoredCandidates.filter(c => c.score >= threshold);
    relevantCandidates.sort((a, b) => b.product.price - a.product.price); // Descending
    
    if (relevantCandidates.length > 0) {
        const best = relevantCandidates[0].product;
        return { product: best, isRepeated: best.id === lastProductId };
    }
  }

  // 6. Intelligent Selection & Duplicate Handling
  const topCandidate = scoredCandidates[0];

  // If scores are extremely low (basically random noise or just gender match), return random from filtered pool
  // to ensure variety instead of always the first "Men's" item in the DB.
  if (topCandidate.score <= 5) { 
     const randomIndex = Math.floor(Math.random() * candidates.length);
     return { product: candidates[randomIndex], isRepeated: false };
  }

  // Check if top candidate is the same as last time
  if (topCandidate.product.id === lastProductId) {
      // Attempt to find the next best candidate
      // We look for a candidate that is NOT the last one, but still has a relevant score (e.g., at least 70% of top score)
      const runnerUp = scoredCandidates.find(c => c.product.id !== lastProductId && c.score >= (topCandidate.score * 0.7));
      
      if (runnerUp) {
          return { product: runnerUp.product, isRepeated: false };
      } else {
          // No valid alternative found. Must return the duplicate.
          return { product: topCandidate.product, isRepeated: true };
      }
  }

  // Return the absolute best match
  return { product: topCandidate.product, isRepeated: false };
};

// --- UI Components ---

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const [imgError, setImgError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // The image URL is already deterministically generated in constants.ts
  // and acts as a unique "cached" identifier for this product type.
  const imageUrl = product.image_url;

  return (
    <div className="group bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden mt-4 flex flex-col sm:flex-row animate-fade-in shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300">
      <div className="w-full sm:w-48 h-64 sm:h-auto shrink-0 bg-slate-800 relative overflow-hidden flex items-center justify-center">
        
        {/* Loading State / Placeholder */}
        {!imageLoaded && !imgError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800 z-0">
                <Loader2 className="animate-spin text-indigo-400/50" size={24} />
            </div>
        )}

        {imgError ? (
            <div className="w-full h-full flex items-center justify-center text-gray-500 flex-col gap-2 z-10">
                <ShoppingBag size={32} strokeWidth={1.5} />
                <span className="text-xs font-medium uppercase tracking-widest">Sin Imagen</span>
            </div>
        ) : (
            <>
            <div className="absolute inset-0 bg-indigo-500/10 mix-blend-overlay z-10 group-hover:opacity-0 transition-opacity" />
            <img 
                src={imageUrl} 
                alt={product.category}
                className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out z-0 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImgError(true)}
            />
            </>
        )}
         {product.sustainable && (
            <div className="absolute top-3 left-3 z-20 bg-emerald-500/90 backdrop-blur text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 border border-emerald-400/30">
                <Leaf size={10} fill="currentColor" /> SUSTAINABLE
            </div>
         )}
         <div className="absolute top-3 right-3 z-20 bg-indigo-600/90 backdrop-blur text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg border border-indigo-400/30">
            ${product.price}
         </div>
      </div>
      
      <div className="flex-1 p-5 flex flex-col justify-between bg-gradient-to-b from-white/5 to-transparent">
        <div>
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-bold text-white tracking-tight">{product.category}</h3>
            <span className="text-xs text-gray-400 uppercase tracking-wider font-medium border border-white/10 px-2 py-0.5 rounded">{product.gender}</span>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="flex items-center gap-1 text-xs text-indigo-200 bg-indigo-500/20 px-2 py-1 rounded-md border border-indigo-500/30">
               <Tag size={10} /> {product.style}
            </span>
            <span className="text-xs text-purple-200 bg-purple-500/20 px-2 py-1 rounded-md border border-purple-500/30">{product.occasion}</span>
            <span className="text-xs text-blue-200 bg-blue-500/20 px-2 py-1 rounded-md border border-blue-500/30">{product.material}</span>
            <span className="text-xs text-pink-200 bg-pink-500/20 px-2 py-1 rounded-md border border-pink-500/30">{product.color}</span>
          </div>
        </div>
        
        <button className="w-full bg-white text-slate-900 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/5">
            <ShoppingBag size={16} />
            Comprar Ahora
        </button>
      </div>
    </div>
  );
};

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.sender === 'user';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-8 group animate-slide-up`}>
      <div className={`flex flex-col max-w-[90%] sm:max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div 
            className={`px-6 py-4 rounded-2xl text-sm sm:text-base leading-relaxed shadow-lg backdrop-blur-md transition-all ${
                isUser 
                ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-sm shadow-indigo-900/20 border border-indigo-500/30' 
                : 'bg-white/10 text-gray-100 rounded-tl-sm border border-white/10 shadow-black/20'
            }`}
        >
          {message.text}
        </div>
        
        {message.isLoading && (
            <div className="mt-3 ml-2 flex items-center gap-3 text-indigo-300/70 text-xs font-medium uppercase tracking-widest">
                <Loader2 className="animate-spin" size={14} />
                <span>Lumina está pensando...</span>
            </div>
        )}
        
        {message.product && <ProductCard product={message.product} />}
      </div>
    </div>
  );
};

const App = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'bot', text: '¡Hola! Soy Lumina, tu experta en moda personal. ¿En qué puedo inspirarte hoy?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEcoFriendly, setIsEcoFriendly] = useState(false);
  
  // MEMORY STATE: Context Sticky Factors
  const [lastCategory, setLastCategory] = useState<string | null>(null);
  const [userGender, setUserGender] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleNewChat = () => {
    setMessages([
      { id: Date.now().toString(), sender: 'bot', text: '¡Hola! Soy Lumina, tu experta en moda personal. ¿En qué puedo inspirarte hoy?' }
    ]);
    setInputValue('');
    setLastCategory(null);
    setUserGender(null); // Reset gender memory
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();
    setInputValue('');
    
    // 1. Add User Message
    const newUserMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text: userText };
    const newHistory = [...messages, newUserMsg];
    setMessages(newHistory);
    setIsLoading(true);

    // 2. AI Processing Placeholder
    const loadingId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: loadingId, sender: 'bot', text: '', isLoading: true }]);

    try {
      // 3. Get Last Recommendation for context
      const lastBotMessageWithProduct = [...messages].reverse().find(m => m.sender === 'bot' && m.product);
      const lastProductId = lastBotMessageWithProduct?.product?.id;

      // 4. Call Gemini
      const extractedAttributes = await callGeminiForProductQuery(userText, newHistory);

      let foundProduct: Product | undefined = undefined;
      let botText = "Lo siento, no te he entendido bien. ¿Puedes repetirlo?"; 

      if (extractedAttributes) {
          botText = extractedAttributes.bot_response;

          // STICKY CONTEXT LOGIC
          // A. Category Persistence
          if (extractedAttributes.category) {
            setLastCategory(extractedAttributes.category);
          } else if (extractedAttributes.search_intent && lastCategory && !extractedAttributes.is_surprise && !extractedAttributes.is_accenture_special) {
             // If searching but no category specified, assume previous category
             extractedAttributes.category = lastCategory;
          }

          // B. Gender Persistence (Memory)
          if (extractedAttributes.gender) {
            setUserGender(extractedAttributes.gender);
          } else if (userGender && !extractedAttributes.gender) {
            // If no gender mentioned in this specific query, inject the known user gender
            extractedAttributes.gender = userGender;
          }

          // Only perform search if Gemini detects a search intent
          if (extractedAttributes.search_intent) {
              const result = findProduct(extractedAttributes, isEcoFriendly, lastProductId);
              foundProduct = result.product;

              // --- HONEST FALLBACK LOGIC ---
              const reqColor = extractedAttributes.color?.toLowerCase();
              const prodColor = foundProduct.color.toLowerCase();
              const reqCategory = extractedAttributes.category?.toLowerCase();
              const prodCategory = foundProduct.category.toLowerCase();

              // If explicit color requested doesn't match product color (and not a surprise)
              if (!extractedAttributes.is_surprise && !extractedAttributes.is_accenture_special && reqColor && !prodColor.includes(reqColor)) {
                 botText = `Vaya, he revisado el inventario y ahora mismo no me quedan opciones en color ${extractedAttributes.color}. Sin embargo, creo que este modelo en ${prodColor} tiene un corte que te quedará genial:`;
              }
              // If explicit category mismatch (rare, but possible in low stock fallback)
              else if (!extractedAttributes.is_surprise && !extractedAttributes.is_accenture_special && reqCategory && !prodCategory.includes(reqCategory)) {
                 botText = `Lo siento, no he encontrado exactamente ${extractedAttributes.category} en stock. Pero basándome en tu estilo, te sugiero esta alternativa:`;
              }
              // If repeated product
              else if (result.isRepeated && !extractedAttributes.is_accenture_special) {
                botText = "He vuelto a mirar todas las estanterías y esta sigue siendo, sin duda, la mejor opción para ti con esas características. ¡Aquí la tienes!";
              }
          }
      }

      // 5. Update Bot Message
      setMessages(prev => prev.map(msg => 
        msg.id === loadingId 
            ? { ...msg, text: botText, product: foundProduct, isLoading: false }
            : msg
      ));

    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.id === loadingId 
            ? { ...msg, text: "Ups, parece que mi conexión con la pasarela de moda se ha interrumpido un momento. ¿Puedes preguntarme de nuevo?", isLoading: false }
            : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[url('https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
      {/* Dark Overlay for Readability */}
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-0"></div>

      <div className="relative z-10 flex flex-col h-full max-w-3xl mx-auto w-full px-4 sm:px-6 py-6">
        
        {/* Header */}
        <header className="flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 mb-6 shadow-2xl ring-1 ring-white/5">
          <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-tr from-indigo-500 to-violet-600 p-3 rounded-xl shadow-inner border border-white/10">
                    <Sparkles className="text-white" size={24} />
                </div>
              </div>
              <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">Lumina</h1>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <p className="text-xs font-medium text-indigo-200/80 tracking-wide uppercase">Fashion AI</p>
                  </div>
              </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
                onClick={handleNewChat}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-300 active:scale-95"
                title="Nuevo Chat"
            >
                <RefreshCcw size={16} />
                <span className="hidden sm:inline">Nuevo Chat</span>
            </button>

            <button 
                onClick={() => setIsEcoFriendly(!isEcoFriendly)}
                className={`relative group flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-500 border ${
                    isEcoFriendly 
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                    : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                }`}
            >
                <Leaf size={14} className={`transition-transform duration-500 ${isEcoFriendly ? 'rotate-0 scale-110' : '-rotate-12'}`} />
                <span>Eco-Mode</span>
                {isEcoFriendly && (
                  <span className="absolute -top-1 -right-1 w-3 h-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                )}
            </button>
          </div>
        </header>

        {/* Chat Main Area */}
        <main className="flex-1 overflow-y-auto mb-4 pr-2 space-y-6 custom-scrollbar pb-4 scroll-smooth">
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </main>

        {/* Footer Input */}
        <footer className="relative mt-auto">
          {/* Decorative Glow */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
          
          <div className="relative bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 flex items-center gap-2 shadow-2xl">
              <div className="pl-4 text-indigo-400">
                <Search size={20} />
              </div>
              <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Pregunta a Lumina..."
                  className="flex-1 bg-transparent text-white placeholder-gray-500 px-3 py-4 outline-none text-sm sm:text-base font-light"
                  disabled={isLoading}
                  autoFocus
              />
              <button 
                  onClick={handleSend}
                  disabled={isLoading || !inputValue.trim()}
                  className={`p-3.5 rounded-xl transition-all duration-300 flex items-center justify-center ${
                      isLoading || !inputValue.trim()
                      ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] active:scale-95'
                  }`}
              >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} strokeWidth={2} />}
              </button>
          </div>
          <div className="text-center mt-3">
              <p className="text-[10px] text-gray-500/60 font-mono uppercase tracking-[0.2em]">Technical Demo • Accenture</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);