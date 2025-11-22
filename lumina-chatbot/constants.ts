import { Product } from "./types";

export const GEMINI_MODEL_NAME = 'gemini-2.5-flash-preview-09-2025';

export const SYSTEM_INSTRUCTION = `
Eres Lumina, una estilista personal experta en moda. Tu tono es elegante, entusiasta y muy humano.

--- TUS OBJETIVOS ---
1. **Entender al usuario**: Analiza su petición y el historial de chat.
2. **Extraer intención**: Rellena el JSON con los atributos de búsqueda.
3. **Responder con naturalidad**: Genera un 'bot_response' fluido y agradable.

--- GESTIÓN DE CONTEXTO Y MEMORIA (CRÍTICO) ---
- Recibirás el historial con etiquetas ocultas [METADATA_PRODUCTO_ANTERIOR...]. Úsalas para tu análisis interno (ej: comparar precios).
- **IMPORTANTE**: NUNCA, bajo ninguna circunstancia, incluyas estas etiquetas [METADATA...] o texto técnico en tu 'bot_response'.
- Tu respuesta debe ser texto limpio.

--- REGLAS DE ESTILO PARA EVENTOS FORMALES (OBLIGATORIO) ---
- Si el usuario menciona **"Boda"**, "Gala", "Cena formal" o "Evento importante":
  - OBLIGATORIO: occasion = "Evento" (o "Boda").
  - OBLIGATORIO: style = "Elegante".
  - PROHIBIDO: Usar "Urbano", "Diario", "Casual" o "Deportivo".
  - Si pide una "Camiseta para boda", asume que busca algo "Elegante" (aunque sea inusual) y coméntalo sutilmente en tu respuesta ("Para una boda suelo recomendar camisas, pero he buscado una opción muy sofisticada...").

--- DETECCIÓN DE "ACCENTURE" O "LA MÁS CHULA" ---
- Si el usuario menciona "Accenture", "Gen AI", "Mavericks", "la más chula", "la mejor camiseta" o frases similares que denoten exclusividad máxima:
  - Activa 'is_accenture_special': true.
  - Activa 'is_expensive': true.
  - En tu respuesta, habla de "nuestra pieza de colección más exclusiva" o "la edición especial de Accenture".

--- DETECCIÓN DE PRECIO ---
- Si pide "la más cara", "de lujo", "premium" -> is_expensive: true.
- Si pide "barata", "económica" -> is_cheap: true.

--- REGLAS DE CATEGORÍA (STICKY CONTEXT) ---
- Si el usuario estaba viendo CAMISETAS y dice "mejor en verde", asume que sigue queriendo una CAMISETA (category="Camiseta"), no un pantalón.
- Mantén la categoría del producto anterior a menos que el usuario la cambie explícitamente.

--- FORMATO JSON DE SALIDA ---
Devuelve SOLO un objeto JSON válido.
{
  "bot_response": "Tu respuesta en texto natural aquí, sin metadatos.",
  "search_intent": true/false,
  "category": "...",
  "color": "...",
  "material": "...",
  "occasion": "...",
  "fit": "...",
  "style": "...",
  "gender": "...",
  "is_cheap": false,
  "is_expensive": false,
  "is_surprise": false,
  "is_accenture_special": false
}
`;

// --- PERSISTENT IMAGE CACHE SYSTEM ---
const CACHE_KEY = 'lumina_image_cache_v1';

const getLocalCache = (): Record<string, string> => {
    try {
        const stored = localStorage.getItem(CACHE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        return {};
    }
};

const saveLocalCache = (cache: Record<string, string>) => {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        // Ignore storage errors
    }
};

const imageCache = getLocalCache();

const translateToEnglish = (text: string): string => {
    const dict: Record<string, string> = {
        'rojo': 'red', 'azul': 'blue', 'verde': 'green', 'negro': 'black', 'blanco': 'white', 
        'amarillo': 'yellow', 'rosa': 'pink', 'gris': 'grey', 'marrón': 'brown', 'beige': 'beige', 
        'azul marino': 'navy blue', 'verde oscuro': 'dark green',
        'camiseta': 't-shirt', 'pantalón': 'trousers', 'vestido': 'dress', 'chaqueta': 'jacket', 
        'sudadera': 'hoodie', 'calzado': 'shoes', 'zapatos': 'shoes',
        'hombre': 'men', 'mujer': 'women', 'niño/a': 'kid',
        'algodón': 'cotton', 'lino': 'linen', 'sintético': 'synthetic',
        'deportivo': 'sportswear', 'urbano': 'streetwear', 'elegante': 'elegant', 'casual': 'casual',
        'ajustado': 'slim fit', 'regular': 'regular fit', 'oversize': 'oversized'
    };
    return dict[text.toLowerCase()] || text;
};

const getOrGenerateImage = (category: string, color: string, gender: string, style: string): string => {
    const uniqueKey = `${category}-${color}-${gender}-${style}`.toLowerCase();

    if (imageCache[uniqueKey]) {
        return imageCache[uniqueKey];
    }

    const catEn = translateToEnglish(category);
    const colEn = translateToEnglish(color);
    const genEn = translateToEnglish(gender);
    const styleEn = translateToEnglish(style);

    const prompt = `ecommerce shot of ${colEn} ${catEn} for ${genEn}, ${styleEn} style, isolated on light gray background, soft studio lighting, 4k, detailed, realistic`;
    
    let hash = 0;
    for (let i = 0; i < uniqueKey.length; i++) {
        const char = uniqueKey.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const seed = Math.abs(hash);

    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=500&height=600&nologo=true&seed=${seed}&model=flux`;

    imageCache[uniqueKey] = url;
    saveLocalCache(imageCache);

    return url;
};


const parseCSV = (csvData: string): Product[] => {
  const lines = csvData.trim().split('\n');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    if (values.length < 12) return null;
    
    // Special handling for pre-defined image URLs (like the Accenture one)
    const rawImageUrl = values[11].trim();
    const hasStaticImage = rawImageUrl.startsWith('http');

    const category = values[1];
    const gender = values[2];
    const style = values[4];
    const color = values[6];

    return {
      id: parseInt(values[0]),
      category: category,
      gender: gender,
      age_group: values[3],
      style: style,
      fit: values[5],
      color: color,
      material: values[7],
      price: parseFloat(values[8]),
      sustainable: values[9].trim() === 'Sí',
      occasion: values[10],
      image_url: hasStaticImage ? rawImageUrl : getOrGenerateImage(category, color, gender, style)
    };
  }).filter((item): item is Product => item !== null);
};

// Dataset Subset + The Special Accenture Item at the end with Price 999
const RAW_CSV_DATA = `product_id,category,gender,age_group,style,fit,color,material,price,sustainable,occasion,image_url
1,Sudadera,Otro,Niño/a,Deportivo,Ajustado,Blanco,Lino,60.71,No,Trabajo,img
2,Sudadera,Otro,Joven adulto,Deportivo,Ajustado,Marrón,Lino,18.28,Sí,Trabajo,img
3,Sudadera,Hombre,Adulto,Urbano,Oversize,Gris,Algodón,20.59,Sí,Evento,img
4,Chaqueta,Otro,Niño/a,Casual,Regular,Gris,Algodón,28.62,Sí,Trabajo,img
5,Camiseta,Hombre,Joven adulto,Urbano,Ajustado,Azul marino,Algodón,68.92,No,Diario,img
6,Vestido,Otro,Adolescente,Urbano,Oversize,Azul marino,Lino,12.06,No,Cena,img
7,Sudadera,Hombre,Niño/a,Casual,Regular,Azul,Sintético,19.23,Sí,Trabajo,img
8,Pantalón,Mujer,Niño/a,Urbano,Oversize,Rosa,Lino,66.85,Sí,Deporte,img
9,Camiseta,Hombre,Joven adulto,Urbano,Ajustado,Azul,Algodón,73.86,No,Cena,img
10,Camiseta,Hombre,Adolescente,Deportivo,Oversize,Rosa,Sintético,88.21,No,Trabajo,img
11,Camiseta,Hombre,Adolescente,Casual,Ajustado,Verde,Algodón,98.69,Sí,Viaje,img
12,Vestido,Hombre,Niño/a,Casual,Ajustado,Rosa,Lino,69.65,Sí,Deporte,img
13,Chaqueta,Mujer,Niño/a,Casual,Oversize,Gris,Algodón,10.38,No,Boda,img
14,Vestido,Mujer,Adolescente,Deportivo,Ajustado,Rosa,Algodón,35.19,No,Diario,img
15,Pantalón,Mujer,Adolescente,Casual,Regular,Amarillo,Sintético,34.09,No,Diario,img
99999,Camiseta,Hombre,Adulto,Elegante,Ajustado,Blanco,Algodón,999.00,Sí,Cena,https://image.pollinations.ai/prompt/white%20t-shirt%20with%20Gen%20AI%20Mavericks%20text%20logo%20printed%20on%20chest%2C%20elegant%20style%2C%20isolated%2C%20fashion%20photography?width=500&height=600&nologo=true`;

export const PRODUCT_CATALOG = parseCSV(RAW_CSV_DATA);