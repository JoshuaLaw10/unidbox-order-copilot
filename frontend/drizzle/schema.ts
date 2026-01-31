import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json } from "drizzle-orm/mysql-core";

/**
 * Dealers table - company profiles for dealers
 */
export const dealers = mysqlTable("dealers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contactPerson: varchar("contactPerson", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Dealer = typeof dealers.$inferSelect;
export type InsertDealer = typeof dealers.$inferInsert;

/**
 * Core user table backing auth flow.
 * Extended with password auth and dealer association.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }), // For email/password login
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "dealer"]).default("user").notNull(),
  dealerId: int("dealerId").references(() => dealers.id), // Link to dealer profile
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Products table - mock wholesale product database
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  sku: varchar("sku", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull().default("pcs"),
  stockQuantity: int("stockQuantity").notNull().default(0),
  minOrderQuantity: int("minOrderQuantity").notNull().default(1),
  leadTimeDays: int("leadTimeDays").notNull().default(3),
  imageUrl: varchar("imageUrl", { length: 500 }), // Product image URL
  isActive: mysqlEnum("isActive", ["yes", "no"]).default("yes").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Inquiries table - dealer inquiries before conversion to orders
 */
export const inquiries = mysqlTable("inquiries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  dealerId: int("dealerId").references(() => dealers.id), // Link to dealer
  dealerName: varchar("dealerName", { length: 255 }),
  dealerEmail: varchar("dealerEmail", { length: 320 }),
  dealerPhone: varchar("dealerPhone", { length: 50 }),
  rawInquiry: text("rawInquiry").notNull(),
  parsedData: json("parsedData"),
  pricingResponse: json("pricingResponse"),
  status: mysqlEnum("status", ["pending", "parsed", "quoted", "converted", "rejected"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = typeof inquiries.$inferInsert;

/**
 * Orders table - confirmed orders from inquiries or direct public orders
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull().unique(),
  inquiryId: int("inquiryId").references(() => inquiries.id),
  userId: int("userId").references(() => users.id),
  dealerId: int("dealerId").references(() => dealers.id), // Link to dealer (optional for public orders)
  // Public order fields (for anonymous dealers)
  publicSessionId: varchar("publicSessionId", { length: 64 }), // Generated session ID for anonymous orders
  companyName: varchar("companyName", { length: 255 }), // Optional company name
  contactNumber: varchar("contactNumber", { length: 50 }), // Optional contact number
  // Legacy dealer fields (kept for backward compatibility)
  dealerName: varchar("dealerName", { length: 255 }), // Now optional
  dealerEmail: varchar("dealerEmail", { length: 320 }),
  dealerPhone: varchar("dealerPhone", { length: 50 }),
  deliveryAddress: text("deliveryAddress"),
  requestedDeliveryDate: timestamp("requestedDeliveryDate"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]).default("pending").notNull(),
  notes: text("notes"),
  doGeneratedAt: timestamp("doGeneratedAt"),
  doUrl: varchar("doUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Order items table - line items for each order
 */
export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").references(() => orders.id).notNull(),
  productId: int("productId").references(() => products.id),
  sku: varchar("sku", { length: 50 }).notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  lineTotal: decimal("lineTotal", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;
