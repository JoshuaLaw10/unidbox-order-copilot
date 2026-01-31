import { invokeLLM } from "./_core/llm";
import { getAllProducts, checkProductAvailability, searchProducts, getProductBySku } from "./db";
import { Product } from "../drizzle/schema";

// ==================== TYPE DEFINITIONS ====================

export interface ParsedInquiryItem {
  productName: string;
  productSku?: string;
  quantity: number;
  unit?: string;
  notes?: string;
}

export interface ParsedInquiry {
  dealerName?: string;
  dealerEmail?: string;
  dealerPhone?: string;
  items: ParsedInquiryItem[];
  requestedDeliveryDate?: string;
  deliveryAddress?: string;
  generalNotes?: string;
  confidence: number;
}

export interface PricingItem {
  productName: string;
  productSku: string;
  requestedQuantity: number;
  availableQuantity: number;
  isAvailable: boolean;
  unitPrice: number;
  unit: string;
  lineTotal: number;
  leadTimeDays: number;
  minOrderQuantity: number;
  notes?: string;
}

export interface PricingResponse {
  items: PricingItem[];
  subtotal: number;
  estimatedTax: number;
  total: number;
  earliestDeliveryDate: string;
  allItemsAvailable: boolean;
  message: string;
}

export interface DeliveryOrderData {
  orderNumber: string;
  orderDate: string;
  dealerName: string;
  dealerEmail?: string;
  dealerPhone?: string;
  deliveryAddress?: string;
  requestedDeliveryDate?: string;
  items: {
    sku: string;
    productName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

// ==================== INQUIRY INTERPRETER AGENT ====================

export async function parseInquiry(rawInquiry: string): Promise<ParsedInquiry> {
  console.log("[InquiryInterpreter] Starting to parse inquiry:", rawInquiry.substring(0, 100));
  
  const products = await getAllProducts();
  console.log("[InquiryInterpreter] Found", products.length, "products in catalog");
  
  const productList = products.map(p => `- ${p.sku}: ${p.name} (${p.category}, $${p.unitPrice}/${p.unit})`).join("\n");

  const systemPrompt = `You are an AI agent that parses wholesale dealer inquiries into structured data.
Your task is to extract product requests, quantities, delivery information, and contact details from free-text inquiries.

Available products in our catalog:
${productList}

Rules:
1. Match product mentions to the closest SKU from the catalog above
2. Extract quantities - look for numbers followed by product names
3. Default unit is "pcs" if not specified
4. Look for delivery dates, addresses, and contact information
5. If a product cannot be matched exactly, try to find the closest match
6. Provide a confidence score (0-1) based on how clear the inquiry is

IMPORTANT: You must return valid JSON only, no other text.`;

  const userPrompt = `Parse this dealer inquiry into structured JSON:

"${rawInquiry}"

Return JSON in this exact format (no markdown, just raw JSON):
{
  "dealerName": "string or null",
  "dealerEmail": "string or null", 
  "dealerPhone": "string or null",
  "items": [
    {
      "productName": "matched product name from catalog",
      "productSku": "matched SKU from catalog",
      "quantity": 10,
      "unit": "pcs",
      "notes": "any notes"
    }
  ],
  "requestedDeliveryDate": "YYYY-MM-DD or null",
  "deliveryAddress": "string or null",
  "generalNotes": "any additional notes",
  "confidence": 0.85
}

If the inquiry mentions products, match them to the catalog. For example:
- "LED lights" should match to "WH-ELEC-001: Industrial LED Panel Light 60W"
- "boxes" or "shipping boxes" should match to "WH-PACK-001: Corrugated Shipping Box"
- "tape" or "packing tape" should match to "WH-PACK-003: Packing Tape"
- "safety vests" should match to "WH-SAFE-002: High-Visibility Safety Vest"
- "gloves" should match to "WH-SAFE-003: Nitrile Gloves"`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    console.log("[InquiryInterpreter] LLM response received");
    
    // Safely extract content from response
    const choices = response?.choices;
    if (!choices || !Array.isArray(choices) || choices.length === 0) {
      console.error("[InquiryInterpreter] No choices in response:", JSON.stringify(response).substring(0, 500));
      throw new Error("No choices in LLM response");
    }
    
    const message = choices[0]?.message;
    if (!message) {
      console.error("[InquiryInterpreter] No message in choice");
      throw new Error("No message in LLM response");
    }
    
    let content = message.content;
    console.log("[InquiryInterpreter] Raw content type:", typeof content);
    
    // Handle different content types
    if (Array.isArray(content)) {
      // Content is an array of parts, find the text part
      const textPart = content.find((part: any) => part.type === "text");
      if (textPart && 'text' in textPart) {
        content = textPart.text;
      } else {
        content = JSON.stringify(content);
      }
    }
    
    if (typeof content !== 'string') {
      console.error("[InquiryInterpreter] Content is not a string:", typeof content);
      throw new Error("Content is not a string");
    }
    
    // Clean up the content - remove markdown code blocks if present
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent.slice(7);
    } else if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith("```")) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();
    
    console.log("[InquiryInterpreter] Cleaned content:", cleanContent.substring(0, 200));
    
    const parsed = JSON.parse(cleanContent) as ParsedInquiry;
    
    // Validate and ensure items array exists
    if (!parsed.items || !Array.isArray(parsed.items)) {
      parsed.items = [];
    }
    
    // Ensure confidence is a number
    if (typeof parsed.confidence !== 'number') {
      parsed.confidence = 0.5;
    }
    
    console.log("[InquiryInterpreter] Successfully parsed", parsed.items.length, "items");
    return parsed;
    
  } catch (error) {
    console.error("[InquiryInterpreter] Error parsing inquiry:", error);
    
    // Try a simpler fallback parsing approach
    return await fallbackParseInquiry(rawInquiry, products);
  }
}

// Fallback parsing when LLM fails
async function fallbackParseInquiry(rawInquiry: string, products: Product[]): Promise<ParsedInquiry> {
  console.log("[InquiryInterpreter] Using fallback parsing");
  
  const items: ParsedInquiryItem[] = [];
  const lowerInquiry = rawInquiry.toLowerCase();
  
  // Simple pattern matching for common products
  const patterns = [
    { keywords: ["led", "light", "panel"], sku: "WH-ELEC-001" },
    { keywords: ["power strip", "power"], sku: "WH-ELEC-002" },
    { keywords: ["extension cord", "extension"], sku: "WH-ELEC-003" },
    { keywords: ["shipping box", "box", "boxes"], sku: "WH-PACK-001" },
    { keywords: ["bubble wrap", "bubble"], sku: "WH-PACK-002" },
    { keywords: ["packing tape", "tape"], sku: "WH-PACK-003" },
    { keywords: ["helmet", "hard hat"], sku: "WH-SAFE-001" },
    { keywords: ["safety vest", "vest", "hi-vis"], sku: "WH-SAFE-002" },
    { keywords: ["glove", "nitrile"], sku: "WH-SAFE-003" },
    { keywords: ["pallet jack", "pallet"], sku: "WH-EQUIP-001" },
    { keywords: ["hand truck", "dolly"], sku: "WH-EQUIP-002" },
    { keywords: ["shelving", "shelf", "rack"], sku: "WH-EQUIP-003" },
    { keywords: ["floor cleaner", "cleaner"], sku: "WH-CLEAN-001" },
    { keywords: ["broom", "push broom"], sku: "WH-CLEAN-002" },
    { keywords: ["trash bag", "garbage bag"], sku: "WH-CLEAN-003" },
  ];
  
  // Extract numbers from the inquiry
  const numberMatches = rawInquiry.match(/(\d+)\s*(?:x\s*)?([a-zA-Z\s]+)/gi) || [];
  
  for (const match of numberMatches) {
    const numMatch = match.match(/(\d+)/);
    const quantity = numMatch ? parseInt(numMatch[1]) : 0;
    if (quantity <= 0) continue;
    
    const textPart = match.replace(/\d+/g, '').trim().toLowerCase();
    
    // Find matching product
    for (const pattern of patterns) {
      if (pattern.keywords.some(kw => textPart.includes(kw) || lowerInquiry.includes(kw))) {
        const product = products.find(p => p.sku === pattern.sku);
        if (product) {
          // Check if we already have this product
          const existing = items.find(i => i.productSku === product.sku);
          if (!existing) {
            items.push({
              productName: product.name,
              productSku: product.sku,
              quantity: quantity,
              unit: product.unit
            });
          }
          break;
        }
      }
    }
  }
  
  // If no items found with numbers, try to find any mentioned products
  if (items.length === 0) {
    for (const pattern of patterns) {
      if (pattern.keywords.some(kw => lowerInquiry.includes(kw))) {
        const product = products.find(p => p.sku === pattern.sku);
        if (product) {
          items.push({
            productName: product.name,
            productSku: product.sku,
            quantity: 1, // Default quantity
            unit: product.unit,
            notes: "Quantity not specified, defaulting to 1"
          });
        }
      }
    }
  }
  
  // Extract delivery date if mentioned
  let requestedDeliveryDate: string | undefined;
  const datePatterns = [
    /(?:by|before|on|deliver(?:y)?(?:\s+by)?)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(?:next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
    /(?:next|this)\s+week/i,
  ];
  
  for (const pattern of datePatterns) {
    const match = rawInquiry.match(pattern);
    if (match) {
      // For simplicity, set a date 7 days from now for "next week" type mentions
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      requestedDeliveryDate = futureDate.toISOString().split('T')[0];
      break;
    }
  }
  
  return {
    items,
    confidence: items.length > 0 ? 0.6 : 0.3,
    generalNotes: items.length === 0 
      ? "Could not automatically parse products. Please specify product names and quantities clearly."
      : "Parsed using pattern matching. Please verify the items.",
    requestedDeliveryDate
  };
}

// ==================== PRICING & AVAILABILITY AGENT ====================

export async function getPricingAndAvailability(parsedInquiry: ParsedInquiry): Promise<PricingResponse> {
  console.log("[PricingAgent] Processing", parsedInquiry.items.length, "items");
  
  const pricingItems: PricingItem[] = [];
  let subtotal = 0;
  let maxLeadTime = 0;
  let allAvailable = true;

  for (const item of parsedInquiry.items) {
    let product: Product | undefined;
    
    console.log("[PricingAgent] Looking up product:", item.productName, "SKU:", item.productSku);
    
    // Try to find product by SKU first
    if (item.productSku) {
      product = await getProductBySku(item.productSku);
      console.log("[PricingAgent] Found by SKU:", product?.name);
    }
    
    // If not found, search by name
    if (!product && item.productName) {
      const searchResults = await searchProducts(item.productName);
      console.log("[PricingAgent] Search results:", searchResults.length);
      if (searchResults.length > 0) {
        product = searchResults[0];
      }
    }

    if (product) {
      const availability = await checkProductAvailability(product.sku, item.quantity);
      const unitPrice = parseFloat(String(product.unitPrice));
      const lineTotal = unitPrice * item.quantity;
      
      console.log("[PricingAgent] Product found:", product.name, "Price:", unitPrice, "Qty:", item.quantity);
      
      pricingItems.push({
        productName: product.name,
        productSku: product.sku,
        requestedQuantity: item.quantity,
        availableQuantity: availability.availableQuantity,
        isAvailable: availability.available,
        unitPrice,
        unit: product.unit,
        lineTotal,
        leadTimeDays: product.leadTimeDays,
        minOrderQuantity: product.minOrderQuantity,
        notes: item.quantity < product.minOrderQuantity 
          ? `Minimum order quantity is ${product.minOrderQuantity}` 
          : undefined
      });

      subtotal += lineTotal;
      maxLeadTime = Math.max(maxLeadTime, product.leadTimeDays);
      if (!availability.available) allAvailable = false;
    } else {
      // Product not found
      console.log("[PricingAgent] Product not found:", item.productName);
      pricingItems.push({
        productName: item.productName,
        productSku: "NOT_FOUND",
        requestedQuantity: item.quantity,
        availableQuantity: 0,
        isAvailable: false,
        unitPrice: 0,
        unit: item.unit || "pcs",
        lineTotal: 0,
        leadTimeDays: 0,
        minOrderQuantity: 0,
        notes: "Product not found in catalog. Please contact sales for assistance."
      });
      allAvailable = false;
    }
  }

  const estimatedTax = subtotal * 0.08; // 8% tax estimate
  const total = subtotal + estimatedTax;

  // Calculate earliest delivery date
  const earliestDate = new Date();
  earliestDate.setDate(earliestDate.getDate() + Math.max(maxLeadTime, 1) + 1);
  const earliestDeliveryDate = earliestDate.toISOString().split('T')[0];

  // Generate response message
  let message = "";
  if (pricingItems.length === 0) {
    message = "No products were identified in your inquiry. Please specify the products and quantities you need.";
  } else if (allAvailable) {
    message = `Great news! All ${pricingItems.length} item(s) are available. Your order total is $${total.toFixed(2)} with earliest delivery on ${earliestDeliveryDate}.`;
  } else {
    const unavailableItems = pricingItems.filter(i => !i.isAvailable);
    message = `${pricingItems.length - unavailableItems.length} of ${pricingItems.length} items are available. Some items have availability issues: ${unavailableItems.map(i => i.productName).join(", ")}. Please review the details below.`;
  }

  console.log("[PricingAgent] Final pricing - Subtotal:", subtotal, "Tax:", estimatedTax, "Total:", total);

  return {
    items: pricingItems,
    subtotal,
    estimatedTax,
    total,
    earliestDeliveryDate,
    allItemsAvailable: allAvailable,
    message
  };
}

// ==================== DO GENERATOR AGENT ====================

export function generateDeliveryOrderData(
  orderNumber: string,
  dealerName: string,
  dealerEmail: string | undefined,
  dealerPhone: string | undefined,
  deliveryAddress: string | undefined,
  requestedDeliveryDate: string | undefined,
  items: {
    sku: string;
    productName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
  }[],
  notes?: string
): DeliveryOrderData {
  const orderItems = items.map(item => ({
    ...item,
    lineTotal: item.quantity * item.unitPrice
  }));

  const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  return {
    orderNumber,
    orderDate: new Date().toISOString().split('T')[0],
    dealerName,
    dealerEmail,
    dealerPhone,
    deliveryAddress,
    requestedDeliveryDate,
    items: orderItems,
    subtotal,
    tax,
    total,
    notes
  };
}

// ==================== SMART PRODUCT SEARCH ====================

export async function smartProductSearch(query: string): Promise<Product[]> {
  // First try direct search
  let results = await searchProducts(query);
  
  if (results.length === 0) {
    // Try searching with individual words
    const words = query.split(/\s+/).filter(w => w.length > 2);
    for (const word of words) {
      const wordResults = await searchProducts(word);
      results = [...results, ...wordResults];
    }
    
    // Remove duplicates
    results = results.filter((product, index, self) => 
      index === self.findIndex(p => p.id === product.id)
    );
  }
  
  return results;
}
