import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  seedProducts: vi.fn().mockResolvedValue(undefined),
  getAllProducts: vi.fn().mockResolvedValue([
    {
      id: 1,
      sku: "WH-ELEC-001",
      name: "Industrial LED Panel Light 60W",
      description: "High-efficiency LED panel",
      category: "Electronics",
      unitPrice: "45.00",
      unit: "pcs",
      stockQuantity: 500,
      minOrderQuantity: 10,
      leadTimeDays: 3,
      isActive: "yes",
    },
    {
      id: 2,
      sku: "WH-PACK-001",
      name: "Corrugated Shipping Box 18x12x12",
      description: "Double-wall corrugated boxes",
      category: "Packaging",
      unitPrice: "2.50",
      unit: "pcs",
      stockQuantity: 5000,
      minOrderQuantity: 100,
      leadTimeDays: 2,
      isActive: "yes",
    },
  ]),
  getProductBySku: vi.fn().mockImplementation((sku: string) => {
    if (sku === "WH-ELEC-001") {
      return Promise.resolve({
        id: 1,
        sku: "WH-ELEC-001",
        name: "Industrial LED Panel Light 60W",
        unitPrice: "45.00",
        unit: "pcs",
        stockQuantity: 500,
        minOrderQuantity: 10,
        leadTimeDays: 3,
      });
    }
    return Promise.resolve(undefined);
  }),
  searchProducts: vi.fn().mockResolvedValue([]),
  getProductsByCategory: vi.fn().mockResolvedValue([]),
  createInquiry: vi.fn().mockResolvedValue(1),
  getInquiryById: vi.fn().mockResolvedValue({
    id: 1,
    rawInquiry: "I need 50 LED lights",
    parsedData: {
      items: [{ productName: "LED lights", productSku: "WH-ELEC-001", quantity: 50, unit: "pcs" }],
      confidence: 0.9,
    },
    status: "parsed",
  }),
  updateInquiry: vi.fn().mockResolvedValue(undefined),
  getAllInquiries: vi.fn().mockResolvedValue([]),
  generateOrderNumber: vi.fn().mockResolvedValue("DO20260131-0001"),
  createOrder: vi.fn().mockResolvedValue(1),
  getOrderById: vi.fn().mockResolvedValue({
    id: 1,
    orderNumber: "DO20260131-0001",
    dealerName: "Test Dealer",
    subtotal: "2250.00",
    tax: "180.00",
    total: "2430.00",
    status: "pending",
  }),
  getOrderByNumber: vi.fn().mockResolvedValue(null),
  updateOrder: vi.fn().mockResolvedValue(undefined),
  getAllOrders: vi.fn().mockResolvedValue([]),
  createOrderItems: vi.fn().mockResolvedValue(undefined),
  getOrderItems: vi.fn().mockResolvedValue([
    {
      id: 1,
      sku: "WH-ELEC-001",
      productName: "Industrial LED Panel Light 60W",
      quantity: 50,
      unitPrice: "45.00",
      lineTotal: "2250.00",
    },
  ]),
  getDashboardStats: vi.fn().mockResolvedValue({
    totalInquiries: 10,
    totalOrders: 5,
    pendingInquiries: 3,
    pendingOrders: 2,
    totalRevenue: 12500,
  }),
  checkProductAvailability: vi.fn().mockResolvedValue({
    available: true,
    product: { sku: "WH-ELEC-001", name: "LED Panel", unitPrice: "45.00" },
    availableQuantity: 500,
    leadTimeDays: 3,
  }),
}));

// Mock the agents
vi.mock("./agents", () => ({
  parseInquiry: vi.fn().mockResolvedValue({
    items: [{ productName: "LED lights", productSku: "WH-ELEC-001", quantity: 50, unit: "pcs" }],
    confidence: 0.9,
  }),
  getPricingAndAvailability: vi.fn().mockResolvedValue({
    items: [
      {
        productName: "Industrial LED Panel Light 60W",
        productSku: "WH-ELEC-001",
        requestedQuantity: 50,
        availableQuantity: 500,
        isAvailable: true,
        unitPrice: 45,
        unit: "pcs",
        lineTotal: 2250,
        leadTimeDays: 3,
        minOrderQuantity: 10,
      },
    ],
    subtotal: 2250,
    estimatedTax: 180,
    total: 2430,
    earliestDeliveryDate: "2026-02-03",
    allItemsAvailable: true,
    message: "All items are available.",
  }),
  generateDeliveryOrderData: vi.fn().mockReturnValue({
    orderNumber: "DO20260131-0001",
    orderDate: "2026-01-31",
    dealerName: "Test Dealer",
    items: [
      {
        sku: "WH-ELEC-001",
        productName: "Industrial LED Panel Light 60W",
        quantity: 50,
        unit: "pcs",
        unitPrice: 45,
        lineTotal: 2250,
      },
    ],
    subtotal: 2250,
    tax: 180,
    total: 2430,
  }),
  smartProductSearch: vi.fn().mockResolvedValue([]),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "regular-user",
      email: "user@example.com",
      name: "Regular User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Products API", () => {
  it("lists all products", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const products = await caller.products.list();

    expect(products).toHaveLength(2);
    expect(products[0].sku).toBe("WH-ELEC-001");
  });

  it("gets product by SKU", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const product = await caller.products.getBysku({ sku: "WH-ELEC-001" });

    expect(product).toBeDefined();
    expect(product?.name).toBe("Industrial LED Panel Light 60W");
  });
});

describe("Inquiries API", () => {
  it("submits a new inquiry", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.inquiries.submit({
      rawInquiry: "I need 50 LED lights for my warehouse",
      dealerName: "Test Dealer",
      dealerEmail: "test@dealer.com",
    });

    expect(result.inquiryId).toBe(1);
    expect(result.parsedData).toBeDefined();
    expect(result.parsedData.items).toHaveLength(1);
  });

  it("gets pricing for an inquiry", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const pricing = await caller.inquiries.getPricing({ inquiryId: 1 });

    expect(pricing.items).toHaveLength(1);
    expect(pricing.total).toBe(2430);
    expect(pricing.allItemsAvailable).toBe(true);
  });

  it("requires admin to list all inquiries", async () => {
    const userCtx = createUserContext();
    const userCaller = appRouter.createCaller(userCtx);

    await expect(userCaller.inquiries.list()).rejects.toThrow("Admin access required");

    const adminCtx = createAdminContext();
    const adminCaller = appRouter.createCaller(adminCtx);

    const inquiries = await adminCaller.inquiries.list();
    expect(Array.isArray(inquiries)).toBe(true);
  });
});

describe("Orders API", () => {
  it("creates order from inquiry", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.orders.createFromInquiry({
      inquiryId: 1,
      dealerName: "Test Dealer",
      dealerEmail: "test@dealer.com",
      items: [
        {
          productSku: "WH-ELEC-001",
          productName: "Industrial LED Panel Light 60W",
          quantity: 50,
          unitPrice: 45,
        },
      ],
    });

    expect(result.orderId).toBe(1);
    expect(result.orderNumber).toBe("DO20260131-0001");
  });

  it("gets order by ID", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const order = await caller.orders.getById({ id: 1 });

    expect(order).toBeDefined();
    expect(order?.orderNumber).toBe("DO20260131-0001");
    expect(order?.items).toHaveLength(1);
  });

  it("generates delivery order data", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const doData = await caller.orders.generateDO({ orderId: 1 });

    expect(doData.orderNumber).toBe("DO20260131-0001");
    expect(doData.items).toHaveLength(1);
    expect(doData.total).toBe(2430);
  });

  it("requires admin to list all orders", async () => {
    const userCtx = createUserContext();
    const userCaller = appRouter.createCaller(userCtx);

    await expect(userCaller.orders.list()).rejects.toThrow("Admin access required");

    const adminCtx = createAdminContext();
    const adminCaller = appRouter.createCaller(adminCtx);

    const orders = await adminCaller.orders.list();
    expect(Array.isArray(orders)).toBe(true);
  });
});

describe("Dashboard API", () => {
  it("returns stats for admin users", async () => {
    const adminCtx = createAdminContext();
    const caller = appRouter.createCaller(adminCtx);

    const stats = await caller.dashboard.stats();

    expect(stats.totalInquiries).toBe(10);
    expect(stats.totalOrders).toBe(5);
    expect(stats.pendingInquiries).toBe(3);
    expect(stats.pendingOrders).toBe(2);
    expect(stats.totalRevenue).toBe(12500);
  });

  it("denies access to non-admin users", async () => {
    const userCtx = createUserContext();
    const caller = appRouter.createCaller(userCtx);

    await expect(caller.dashboard.stats()).rejects.toThrow("Admin access required");
  });
});
