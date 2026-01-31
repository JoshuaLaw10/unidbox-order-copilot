import { eq, like, or, desc, sql, and, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, User,
  products, InsertProduct, Product,
  inquiries, InsertInquiry, Inquiry,
  orders, InsertOrder, Order,
  orderItems, InsertOrderItem, OrderItem,
  dealers, InsertDealer, Dealer
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { nanoid } from 'nanoid';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== USER OPERATIONS ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "passwordHash"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (user.dealerId !== undefined) {
      values.dealerId = user.dealerId;
      updateSet.dealerId = user.dealerId;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function createUserWithPassword(
  email: string,
  passwordHash: string,
  name: string,
  role: 'user' | 'admin' | 'dealer',
  dealerId?: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const openId = `local_${nanoid(16)}`;
  const result = await db.insert(users).values({
    openId,
    email,
    passwordHash,
    name,
    role,
    dealerId: dealerId || null,
    loginMethod: 'password',
    lastSignedIn: new Date(),
  });
  return result[0].insertId;
}

export async function updateUserLastSignedIn(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

// ==================== DEALER OPERATIONS ====================

export async function createDealer(dealer: InsertDealer): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(dealers).values(dealer);
  return result[0].insertId;
}

export async function getDealerById(id: number): Promise<Dealer | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(dealers).where(eq(dealers.id, id)).limit(1);
  return result[0];
}

export async function getAllDealers(): Promise<Dealer[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dealers).orderBy(desc(dealers.createdAt));
}

// ==================== DEMO SEED DATA ====================

// Simple hash function for demo (in production, use bcrypt)
function simpleHash(password: string): string {
  // For demo purposes, we'll use a simple reversible encoding
  // In production, use bcrypt or argon2
  return Buffer.from(password).toString('base64');
}

export function verifyPassword(password: string, hash: string): boolean {
  return simpleHash(password) === hash;
}

export async function seedDemoAccounts(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Check if demo accounts already exist
  const existingAdmin = await getUserByEmail('admin@demo.com');
  if (existingAdmin) {
    console.log("[Database] Demo accounts already seeded");
    return;
  }

  console.log("[Database] Seeding demo accounts...");

  // Create demo dealer profile
  const dealerResult = await db.insert(dealers).values({
    name: "Demo Wholesale Co.",
    contactPerson: "John Dealer",
    email: "dealer@demo.com",
    phone: "+1 555-0100",
    address: "123 Warehouse Lane, Industrial District, CA 90210",
  });
  const dealerId = dealerResult[0].insertId;

  // Create admin user
  await db.insert(users).values({
    openId: `local_admin_${nanoid(8)}`,
    email: 'admin@demo.com',
    passwordHash: simpleHash('admin123'),
    name: 'Admin User',
    role: 'admin',
    dealerId: null,
    loginMethod: 'password',
    lastSignedIn: new Date(),
  });

  // Create dealer user
  await db.insert(users).values({
    openId: `local_dealer_${nanoid(8)}`,
    email: 'dealer@demo.com',
    passwordHash: simpleHash('dealer123'),
    name: 'John Dealer',
    role: 'dealer',
    dealerId: dealerId,
    loginMethod: 'password',
    lastSignedIn: new Date(),
  });

  console.log("[Database] Demo accounts seeded successfully");
  console.log("  - admin@demo.com / admin123 (role: admin)");
  console.log("  - dealer@demo.com / dealer123 (role: dealer)");
}

// ==================== PRODUCT OPERATIONS ====================

const mockProducts: InsertProduct[] = [
  { sku: "WH-ELEC-001", name: "Industrial LED Panel Light 60W", description: "High-efficiency LED panel for warehouses and factories", category: "Electronics", unitPrice: "45.00", unit: "pcs", stockQuantity: 500, minOrderQuantity: 10, leadTimeDays: 3, imageUrl: "https://images.unsplash.com/photo-1565814636199-ae8133055c1c?w=400&h=400&fit=crop" },
  { sku: "WH-ELEC-002", name: "Smart Power Strip 6-Outlet", description: "Surge-protected power strip with USB ports", category: "Electronics", unitPrice: "28.50", unit: "pcs", stockQuantity: 1200, minOrderQuantity: 20, leadTimeDays: 2, imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop" },
  { sku: "WH-ELEC-003", name: "Industrial Extension Cord 50ft", description: "Heavy-duty extension cord for industrial use", category: "Electronics", unitPrice: "35.00", unit: "pcs", stockQuantity: 800, minOrderQuantity: 15, leadTimeDays: 3, imageUrl: "https://images.unsplash.com/photo-1601524909162-ae8725290836?w=400&h=400&fit=crop" },
  { sku: "WH-PACK-001", name: "Corrugated Shipping Box 18x12x12", description: "Double-wall corrugated boxes for shipping", category: "Packaging", unitPrice: "2.50", unit: "pcs", stockQuantity: 5000, minOrderQuantity: 100, leadTimeDays: 2, imageUrl: "https://images.unsplash.com/photo-1607166452427-7e4477079cb9?w=400&h=400&fit=crop" },
  { sku: "WH-PACK-002", name: "Bubble Wrap Roll 12in x 175ft", description: "Protective bubble wrap for fragile items", category: "Packaging", unitPrice: "18.00", unit: "roll", stockQuantity: 300, minOrderQuantity: 10, leadTimeDays: 2, imageUrl: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400&h=400&fit=crop" },
  { sku: "WH-PACK-003", name: "Packing Tape 2in x 110yd (36 rolls)", description: "Clear packing tape for sealing boxes", category: "Packaging", unitPrice: "42.00", unit: "case", stockQuantity: 200, minOrderQuantity: 5, leadTimeDays: 1, imageUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=400&fit=crop" },
  { sku: "WH-SAFE-001", name: "Safety Helmet Class E", description: "ANSI-certified hard hat for industrial safety", category: "Safety", unitPrice: "15.00", unit: "pcs", stockQuantity: 1000, minOrderQuantity: 25, leadTimeDays: 3, imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=400&fit=crop" },
  { sku: "WH-SAFE-002", name: "High-Vis Safety Vest Class 2", description: "Reflective safety vest for warehouse workers", category: "Safety", unitPrice: "8.50", unit: "pcs", stockQuantity: 2000, minOrderQuantity: 50, leadTimeDays: 2, imageUrl: "https://images.unsplash.com/photo-1618090583459-7f8f8c3d4e4d?w=400&h=400&fit=crop" },
  { sku: "WH-SAFE-003", name: "Nitrile Gloves Box (100 count)", description: "Disposable nitrile gloves for handling", category: "Safety", unitPrice: "12.00", unit: "box", stockQuantity: 1500, minOrderQuantity: 20, leadTimeDays: 1, imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop" },
  { sku: "WH-TOOL-001", name: "Pallet Jack Manual 5500lb", description: "Heavy-duty manual pallet jack", category: "Equipment", unitPrice: "320.00", unit: "pcs", stockQuantity: 50, minOrderQuantity: 1, leadTimeDays: 7, imageUrl: "https://images.unsplash.com/photo-1553413077-190dd305871c?w=400&h=400&fit=crop" },
  { sku: "WH-TOOL-002", name: "Hand Truck 600lb Capacity", description: "Two-wheel hand truck for moving boxes", category: "Equipment", unitPrice: "85.00", unit: "pcs", stockQuantity: 150, minOrderQuantity: 2, leadTimeDays: 5, imageUrl: "https://images.unsplash.com/photo-1586528116022-a0e0f6828a7f?w=400&h=400&fit=crop" },
  { sku: "WH-TOOL-003", name: "Warehouse Shelving Unit 48x24x72", description: "Heavy-duty steel shelving unit", category: "Equipment", unitPrice: "145.00", unit: "pcs", stockQuantity: 100, minOrderQuantity: 2, leadTimeDays: 7, imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop" },
  { sku: "WH-CLEA-001", name: "Industrial Floor Cleaner 5gal", description: "Concentrated floor cleaning solution", category: "Cleaning", unitPrice: "38.00", unit: "bucket", stockQuantity: 200, minOrderQuantity: 4, leadTimeDays: 2, imageUrl: "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&h=400&fit=crop" },
  { sku: "WH-CLEA-002", name: "Push Broom 24in Heavy Duty", description: "Wide push broom for warehouse floors", category: "Cleaning", unitPrice: "22.00", unit: "pcs", stockQuantity: 300, minOrderQuantity: 5, leadTimeDays: 2, imageUrl: "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400&h=400&fit=crop" },
  { sku: "WH-CLEA-003", name: "Trash Bags 55gal (50 count)", description: "Heavy-duty contractor trash bags", category: "Cleaning", unitPrice: "28.00", unit: "box", stockQuantity: 400, minOrderQuantity: 10, leadTimeDays: 1, imageUrl: "https://images.unsplash.com/photo-1610141256829-f6f6e8e6e8f0?w=400&h=400&fit=crop" },
];

export async function seedProducts(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await db.select({ count: sql<number>`count(*)` }).from(products);
  if (existing[0]?.count > 0) return;

  for (const product of mockProducts) {
    await db.insert(products).values(product);
  }
  console.log("[Database] Seeded mock products");
}

export async function getAllProducts(): Promise<Product[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.isActive, "yes"));
}

export async function getProductBySku(sku: string): Promise<Product | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.sku, sku)).limit(1);
  return result[0];
}

export async function searchProducts(query: string): Promise<Product[]> {
  const db = await getDb();
  if (!db) return [];
  const searchTerm = `%${query}%`;
  return db.select().from(products).where(
    and(
      eq(products.isActive, "yes"),
      or(
        like(products.name, searchTerm),
        like(products.sku, searchTerm),
        like(products.category, searchTerm),
        like(products.description, searchTerm)
      )
    )
  );
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(
    and(eq(products.category, category), eq(products.isActive, "yes"))
  );
}

export async function checkProductAvailability(sku: string, quantity: number): Promise<{
  available: boolean;
  product: Product | null;
  availableQuantity: number;
  leadTimeDays: number;
}> {
  const product = await getProductBySku(sku);
  if (!product) {
    return { available: false, product: null, availableQuantity: 0, leadTimeDays: 0 };
  }
  return {
    available: product.stockQuantity >= quantity,
    product,
    availableQuantity: product.stockQuantity,
    leadTimeDays: product.leadTimeDays,
  };
}

export async function updateProduct(id: number, data: Partial<InsertProduct>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(products).set(data).where(eq(products.id, id));
}

export async function getProductById(id: number): Promise<Product | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0];
}

export async function getProductsWithOrderCount(): Promise<(Product & { activeOrderCount: number })[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Get all active products
  const allProducts = await db.select().from(products).where(eq(products.isActive, "yes"));
  
  // Get order counts per product SKU from active orders
  const activeOrders = await db.select().from(orders).where(
    or(
      eq(orders.status, "pending"),
      eq(orders.status, "confirmed"),
      eq(orders.status, "processing")
    )
  );
  
  const orderIds = activeOrders.map(o => o.id);
  
  // Count items per SKU
  const skuCounts: Record<string, number> = {};
  if (orderIds.length > 0) {
    const items = await db.select().from(orderItems);
    const activeItems = items.filter(item => orderIds.includes(item.orderId));
    activeItems.forEach(item => {
      skuCounts[item.sku] = (skuCounts[item.sku] || 0) + 1;
    });
  }
  
  return allProducts.map(p => ({
    ...p,
    activeOrderCount: skuCounts[p.sku] || 0,
  }));
}

// ==================== INQUIRY OPERATIONS ====================

export async function createInquiry(inquiry: InsertInquiry): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(inquiries).values(inquiry);
  return result[0].insertId;
}

export async function getInquiryById(id: number): Promise<Inquiry | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(inquiries).where(eq(inquiries.id, id)).limit(1);
  return result[0];
}

export async function updateInquiry(id: number, data: Partial<InsertInquiry>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(inquiries).set(data).where(eq(inquiries.id, id));
}

export async function getAllInquiries(filters?: {
  status?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  dealerId?: number;
}): Promise<Inquiry[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  
  if (filters?.status) {
    conditions.push(eq(inquiries.status, filters.status as any));
  }
  if (filters?.search) {
    const searchTerm = `%${filters.search}%`;
    conditions.push(or(
      like(inquiries.dealerName, searchTerm),
      like(inquiries.dealerEmail, searchTerm),
      like(inquiries.rawInquiry, searchTerm)
    ));
  }
  if (filters?.startDate) {
    conditions.push(gte(inquiries.createdAt, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(inquiries.createdAt, filters.endDate));
  }
  if (filters?.dealerId) {
    conditions.push(eq(inquiries.dealerId, filters.dealerId));
  }
  
  if (conditions.length > 0) {
    return db.select().from(inquiries).where(and(...conditions)).orderBy(desc(inquiries.createdAt));
  }
  return db.select().from(inquiries).orderBy(desc(inquiries.createdAt));
}

export async function getInquiriesByDealerId(dealerId: number): Promise<Inquiry[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inquiries).where(eq(inquiries.dealerId, dealerId)).orderBy(desc(inquiries.createdAt));
}

// ==================== ORDER OPERATIONS ====================

export async function generateOrderNumber(): Promise<string> {
  const date = new Date();
  const prefix = `DO${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${random}`;
}

export async function createOrder(order: InsertOrder): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(orders).values(order);
  return result[0].insertId;
}

export async function getOrderById(id: number): Promise<Order | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result[0];
}

export async function getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  return result[0];
}

export async function updateOrder(id: number, data: Partial<InsertOrder>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set(data).where(eq(orders.id, id));
}

export async function getAllOrders(filters?: {
  status?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  dealerId?: number;
}): Promise<Order[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  
  if (filters?.status) {
    conditions.push(eq(orders.status, filters.status as any));
  }
  if (filters?.search) {
    const searchTerm = `%${filters.search}%`;
    conditions.push(or(
      like(orders.dealerName, searchTerm),
      like(orders.orderNumber, searchTerm),
      like(orders.dealerEmail, searchTerm)
    ));
  }
  if (filters?.startDate) {
    conditions.push(gte(orders.createdAt, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(orders.createdAt, filters.endDate));
  }
  if (filters?.dealerId) {
    conditions.push(eq(orders.dealerId, filters.dealerId));
  }
  
  if (conditions.length > 0) {
    return db.select().from(orders).where(and(...conditions)).orderBy(desc(orders.createdAt));
  }
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}

export async function getOrdersByDealerId(dealerId: number): Promise<Order[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.dealerId, dealerId)).orderBy(desc(orders.createdAt));
}

export async function getOrdersByEmail(email: string): Promise<Order[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.dealerEmail, email)).orderBy(desc(orders.createdAt));
}

export async function getOrdersWithDO(): Promise<Order[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(sql`${orders.doGeneratedAt} IS NOT NULL`).orderBy(desc(orders.doGeneratedAt));
}

// ==================== ORDER ITEMS OPERATIONS ====================

export async function createOrderItems(items: InsertOrderItem[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (const item of items) {
    await db.insert(orderItems).values(item);
  }
}

export async function getOrderItems(orderId: number): Promise<OrderItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

// ==================== DASHBOARD STATS ====================

export async function getDashboardStats(): Promise<{
  totalInquiries: number;
  totalOrders: number;
  pendingInquiries: number;
  pendingOrders: number;
  totalRevenue: number;
}> {
  const db = await getDb();
  if (!db) return { totalInquiries: 0, totalOrders: 0, pendingInquiries: 0, pendingOrders: 0, totalRevenue: 0 };
  
  const [inquiryCount] = await db.select({ count: sql<number>`count(*)` }).from(inquiries);
  const [orderCount] = await db.select({ count: sql<number>`count(*)` }).from(orders);
  const [pendingInqCount] = await db.select({ count: sql<number>`count(*)` }).from(inquiries).where(eq(inquiries.status, "pending"));
  const [pendingOrdCount] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.status, "pending"));
  const [revenue] = await db.select({ total: sql<number>`COALESCE(SUM(total), 0)` }).from(orders).where(eq(orders.status, "confirmed"));
  
  return {
    totalInquiries: inquiryCount?.count || 0,
    totalOrders: orderCount?.count || 0,
    pendingInquiries: pendingInqCount?.count || 0,
    pendingOrders: pendingOrdCount?.count || 0,
    totalRevenue: revenue?.total || 0,
  };
}
