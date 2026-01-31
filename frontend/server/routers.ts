import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { SignJWT, jwtVerify } from "jose";
import {
  seedProducts,
  seedDemoAccounts,
  getAllProducts,
  getProductBySku,
  searchProducts,
  getProductsByCategory,
  updateProduct,
  getProductsWithOrderCount,
  createInquiry,
  getInquiryById,
  updateInquiry,
  getAllInquiries,
  getInquiriesByDealerId,
  generateOrderNumber,
  createOrder,
  getOrderById,
  getOrderByNumber,
  updateOrder,
  getAllOrders,
  getOrdersByDealerId,
  getOrdersByEmail,
  getOrdersWithDO,
  createOrderItems,
  getOrderItems,
  getDashboardStats,
  getUserByEmail,
  verifyPassword,
  updateUserLastSignedIn,
  getDealerById,
} from "./db";
import {
  parseInquiry,
  getPricingAndAvailability,
  generateDeliveryOrderData,
  smartProductSearch,
  ParsedInquiry,
} from "./agents";
import { sendOrderNotification, sendOrderStatusNotification } from "./email";
import { sendCustomerOrderEmail, sendCustomerStatusEmail } from "./customerEmail";
import { ENV } from "./_core/env";

// Seed products and demo accounts on server start
seedProducts().catch(console.error);
seedDemoAccounts().catch(console.error);

// JWT secret for password-based auth
const JWT_SECRET = new TextEncoder().encode(ENV.cookieSecret || 'unidbox-secret-key-change-in-production');

// Admin procedure - only allows admin users
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

// Dealer procedure - only allows dealer users
const dealerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'dealer') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Dealer access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    // Password-based login
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByEmail(input.email);
        
        if (!user || !user.passwordHash) {
          throw new TRPCError({ 
            code: 'UNAUTHORIZED', 
            message: 'Invalid email or password' 
          });
        }

        if (!verifyPassword(input.password, user.passwordHash)) {
          throw new TRPCError({ 
            code: 'UNAUTHORIZED', 
            message: 'Invalid email or password' 
          });
        }

        // Update last signed in
        await updateUserLastSignedIn(user.id);

        // Create session token using SDK format (openId, appId, name)
        // The SDK verifySession expects these specific fields
        const token = await new SignJWT({ 
          openId: user.openId,
          appId: ENV.appId || 'unidbox',
          name: user.name || user.email || '',
        })
          .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
          .setExpirationTime(Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000))
          .sign(JWT_SECRET);

        // Set cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // Get dealer info if applicable
        let dealer = null;
        if (user.dealerId) {
          dealer = await getDealerById(user.dealerId);
        }

        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            dealerId: user.dealerId,
          },
          dealer,
          redirectTo: user.role === 'admin' ? '/admin' : '/dealer',
        };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // Staff-only login (admin only)
    staffLogin: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByEmail(input.email);
        
        if (!user || !user.passwordHash) {
          throw new TRPCError({ 
            code: 'UNAUTHORIZED', 
            message: 'Invalid credentials' 
          });
        }

        // Only allow admin role for staff login
        if (user.role !== 'admin') {
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: 'Access denied. Staff portal is for administrators only.' 
          });
        }

        if (!verifyPassword(input.password, user.passwordHash)) {
          throw new TRPCError({ 
            code: 'UNAUTHORIZED', 
            message: 'Invalid credentials' 
          });
        }

        // Update last signed in
        await updateUserLastSignedIn(user.id);

        // Create session token
        const token = await new SignJWT({ 
          openId: user.openId,
          appId: ENV.appId || 'unidbox',
          name: user.name || user.email || '',
        })
          .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
          .setExpirationTime(Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000))
          .sign(JWT_SECRET);

        // Set cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        };
      }),

    // Get current user with dealer info
    getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
      let dealer = null;
      if (ctx.user.dealerId) {
        dealer = await getDealerById(ctx.user.dealerId);
      }
      return {
        user: ctx.user,
        dealer,
      };
    }),
  }),

  // ==================== PRODUCT ROUTES ====================
  products: router({
    list: publicProcedure.query(async () => {
      return getAllProducts();
    }),

    getByCategory: publicProcedure
      .input(z.object({ category: z.string() }))
      .query(async ({ input }) => {
        return getProductsByCategory(input.category);
      }),

    search: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        return searchProducts(input.query);
      }),

    smartSearch: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        return smartProductSearch(input.query);
      }),

    getBysku: publicProcedure
      .input(z.object({ sku: z.string() }))
      .query(async ({ input }) => {
        return getProductBySku(input.sku);
      }),

    // Admin: Get products with order count
    listWithOrderCount: adminProcedure.query(async () => {
      return getProductsWithOrderCount();
    }),

    // Admin: Update product price
    updatePrice: adminProcedure
      .input(z.object({
        id: z.number(),
        price: z.string(),
      }))
      .mutation(async ({ input }) => {
        await updateProduct(input.id, { unitPrice: input.price });
        return { success: true };
      }),

    // Admin: Update product stock
    updateStock: adminProcedure
      .input(z.object({
        id: z.number(),
        stock: z.number(),
      }))
      .mutation(async ({ input }) => {
        await updateProduct(input.id, { stockQuantity: input.stock });
        return { success: true };
      }),

    // Admin: Update product lead time
    updateLeadTime: adminProcedure
      .input(z.object({
        id: z.number(),
        leadTimeDays: z.number(),
      }))
      .mutation(async ({ input }) => {
        await updateProduct(input.id, { leadTimeDays: input.leadTimeDays });
        return { success: true };
      }),
  }),

  // ==================== INQUIRY ROUTES ====================
  inquiries: router({
    // Submit a new inquiry (public or dealer)
    submit: publicProcedure
      .input(z.object({
        rawInquiry: z.string().min(1),
        dealerName: z.string().optional(),
        dealerEmail: z.string().email().optional(),
        dealerPhone: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get dealer info from context if logged in as dealer
        let dealerId = null;
        let dealerName = input.dealerName || null;
        let dealerEmail = input.dealerEmail || null;
        
        if (ctx.user && ctx.user.role === 'dealer' && ctx.user.dealerId) {
          dealerId = ctx.user.dealerId;
          const dealer = await getDealerById(ctx.user.dealerId);
          if (dealer) {
            dealerName = dealer.name;
            dealerEmail = dealer.email;
          }
        }

        // Create inquiry record
        const inquiryId = await createInquiry({
          rawInquiry: input.rawInquiry,
          dealerId,
          dealerName,
          dealerEmail,
          dealerPhone: input.dealerPhone || null,
          status: "pending",
        });

        // Parse inquiry using AI agent
        const parsedData = await parseInquiry(input.rawInquiry);
        
        // Update with parsed data
        await updateInquiry(inquiryId, {
          parsedData: parsedData as any,
          status: "parsed",
          dealerName: parsedData.dealerName || dealerName || null,
          dealerEmail: parsedData.dealerEmail || dealerEmail || null,
          dealerPhone: parsedData.dealerPhone || input.dealerPhone || null,
        });

        return { inquiryId, parsedData };
      }),

    // Get pricing for a parsed inquiry
    getPricing: publicProcedure
      .input(z.object({ inquiryId: z.number() }))
      .mutation(async ({ input }) => {
        const inquiry = await getInquiryById(input.inquiryId);
        if (!inquiry) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Inquiry not found" });
        }

        const parsedData = inquiry.parsedData as ParsedInquiry;
        if (!parsedData || !parsedData.items) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Inquiry not parsed yet" });
        }

        const pricingResponse = await getPricingAndAvailability(parsedData);

        await updateInquiry(input.inquiryId, {
          pricingResponse: pricingResponse as any,
          status: "quoted",
        });

        return pricingResponse;
      }),

    // Get inquiry by ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getInquiryById(input.id);
      }),

    // List all inquiries (admin only)
    list: adminProcedure
      .input(z.object({
        status: z.string().optional(),
        search: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional())
      .query(async ({ input }) => {
        return getAllInquiries(input);
      }),

    // List dealer's own inquiries
    myInquiries: dealerProcedure.query(async ({ ctx }) => {
      if (!ctx.user.dealerId) {
        return [];
      }
      return getInquiriesByDealerId(ctx.user.dealerId);
    }),

    // Update inquiry status (admin only)
    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "parsed", "quoted", "converted", "rejected"]),
      }))
      .mutation(async ({ input }) => {
        await updateInquiry(input.id, { status: input.status });
        return { success: true };
      }),
  }),

  // ==================== ORDER ROUTES ====================
  orders: router({
    // Create order from inquiry
    createFromInquiry: publicProcedure
      .input(z.object({
        inquiryId: z.number(),
        dealerName: z.string(),
        dealerEmail: z.string().email().optional(),
        dealerPhone: z.string().optional(),
        deliveryAddress: z.string().optional(),
        requestedDeliveryDate: z.date().optional(),
        items: z.array(z.object({
          productSku: z.string(),
          productName: z.string(),
          quantity: z.number(),
          unitPrice: z.number(),
        })),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const orderNumber = await generateOrderNumber();
        
        // Get dealer info from context if logged in as dealer
        let dealerId = null;
        if (ctx.user && ctx.user.role === 'dealer' && ctx.user.dealerId) {
          dealerId = ctx.user.dealerId;
        }
        
        // Calculate totals
        const subtotal = input.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const tax = subtotal * 0.08;
        const total = subtotal + tax;

        // Create order
        const orderId = await createOrder({
          orderNumber,
          inquiryId: input.inquiryId,
          dealerId,
          dealerName: input.dealerName,
          dealerEmail: input.dealerEmail || null,
          dealerPhone: input.dealerPhone || null,
          deliveryAddress: input.deliveryAddress || null,
          requestedDeliveryDate: input.requestedDeliveryDate || null,
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
          status: "pending",
          notes: input.notes || null,
        });

        // Create order items
        await createOrderItems(input.items.map(item => ({
          orderId,
          sku: item.productSku,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
          lineTotal: (item.quantity * item.unitPrice).toFixed(2),
        })));

        // Update inquiry status
        await updateInquiry(input.inquiryId, { status: "converted" });

        // Send order notification to owner (non-blocking)
        if (input.dealerEmail) {
          sendOrderNotification({
            orderNumber,
            dealerName: input.dealerName,
            dealerEmail: input.dealerEmail,
            deliveryAddress: input.deliveryAddress || '',
            deliveryDate: input.requestedDeliveryDate ? input.requestedDeliveryDate.toLocaleDateString() : '',
            items: input.items.map(item => ({
              productName: item.productName,
              sku: item.productSku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.quantity * item.unitPrice,
            })),
            subtotal,
            tax,
            total,
            notes: input.notes,
          }).catch(console.error);

          // Send confirmation email to customer (non-blocking)
          sendCustomerOrderEmail({
            orderNumber,
            customerName: input.dealerName,
            customerEmail: input.dealerEmail,
            deliveryAddress: input.deliveryAddress || '',
            deliveryDate: input.requestedDeliveryDate ? input.requestedDeliveryDate.toLocaleDateString() : '',
            items: input.items.map(item => ({
              productName: item.productName,
              sku: item.productSku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.quantity * item.unitPrice,
            })),
            subtotal,
            tax,
            total,
            notes: input.notes,
          }).catch(console.error);
        }

        return { orderId, orderNumber };
      }),

    // Create public order (no login required)
    createPublic: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        companyName: z.string().optional(),
        email: z.string().email().optional(),
        contactNumber: z.string().optional(),
        deliveryAddress: z.string(),
        deliveryDate: z.string(),
        notes: z.string().optional(),
        items: z.array(z.object({
          sku: z.string(),
          productName: z.string(),
          quantity: z.number(),
          unitPrice: z.number(),
        })),
      }))
      .mutation(async ({ input }) => {
        const orderNumber = await generateOrderNumber();
        
        // Calculate totals
        const subtotal = input.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const tax = 0; // No tax for public orders
        const total = subtotal + tax;

        // Create order with public session ID
        const orderId = await createOrder({
          orderNumber,
          publicSessionId: input.sessionId,
          companyName: input.companyName || null,
          contactNumber: input.contactNumber || null,
          dealerName: input.companyName || 'Anonymous',
          dealerEmail: input.email || null,
          deliveryAddress: input.deliveryAddress,
          requestedDeliveryDate: new Date(input.deliveryDate),
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
          status: "pending",
          notes: input.notes || null,
        });

        // Create order items
        await createOrderItems(input.items.map(item => ({
          orderId,
          sku: item.sku,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
          lineTotal: (item.quantity * item.unitPrice).toFixed(2),
        })));

        // Send order notification to owner (non-blocking)
        if (input.email) {
          sendOrderNotification({
            orderNumber,
            dealerName: input.companyName || 'Customer',
            dealerEmail: input.email,
            deliveryAddress: input.deliveryAddress,
            deliveryDate: input.deliveryDate,
            items: input.items.map(item => ({
              productName: item.productName,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.quantity * item.unitPrice,
            })),
            subtotal,
            tax,
            total,
            notes: input.notes,
          }).catch(console.error);

          // Send confirmation email to customer (non-blocking)
          sendCustomerOrderEmail({
            orderNumber,
            customerName: input.companyName || 'Customer',
            customerEmail: input.email,
            deliveryAddress: input.deliveryAddress,
            deliveryDate: input.deliveryDate,
            items: input.items.map(item => ({
              productName: item.productName,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.quantity * item.unitPrice,
            })),
            subtotal,
            tax,
            total,
            notes: input.notes,
          }).catch(console.error);
        }

        return { orderId, orderNumber };
      }),

    // Get order by ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const order = await getOrderById(input.id);
        if (!order) return null;
        const items = await getOrderItems(input.id);
        return { ...order, items };
      }),

    // Get order by number
    getByNumber: publicProcedure
      .input(z.object({ orderNumber: z.string() }))
      .query(async ({ input }) => {
        const order = await getOrderByNumber(input.orderNumber);
        if (!order) return null;
        const items = await getOrderItems(order.id);
        return { ...order, items };
      }),

    // Get orders by email (for order tracking)
    getByEmail: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ input }) => {
        const orders = await getOrdersByEmail(input.email);
        // Get items for each order
        const ordersWithItems = await Promise.all(
          orders.map(async (order) => {
            const items = await getOrderItems(order.id);
            return { ...order, items };
          })
        );
        return ordersWithItems;
      }),

    // List all orders (admin only)
    list: adminProcedure
      .input(z.object({
        status: z.string().optional(),
        search: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional())
      .query(async ({ input }) => {
        return getAllOrders(input);
      }),

    // List dealer's own orders
    myOrders: dealerProcedure.query(async ({ ctx }) => {
      if (!ctx.user.dealerId) {
        return [];
      }
      return getOrdersByDealerId(ctx.user.dealerId);
    }),

    // Get DO history (admin only)
    doHistory: adminProcedure.query(async () => {
      return getOrdersWithDO();
    }),

    // Update order status (admin only)
    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]),
      }))
      .mutation(async ({ input }) => {
        await updateOrder(input.id, { status: input.status });
        return { success: true };
      }),

    // Generate delivery order data
    generateDO: publicProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ input }) => {
        const order = await getOrderById(input.orderId);
        if (!order) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        }

        const items = await getOrderItems(input.orderId);
        
        const doData = generateDeliveryOrderData(
          order.orderNumber,
          order.dealerName || order.companyName || 'Anonymous Dealer',
          order.dealerEmail || undefined,
          order.dealerPhone || undefined,
          order.deliveryAddress || undefined,
          order.requestedDeliveryDate?.toISOString().split('T')[0],
          items.map(item => ({
            sku: item.sku,
            productName: item.productName,
            quantity: item.quantity,
            unit: "pcs",
            unitPrice: parseFloat(item.unitPrice as string),
          })),
          order.notes || undefined
        );

        // Update order with DO generation timestamp
        await updateOrder(input.orderId, {
          doGeneratedAt: new Date(),
        });

        return doData;
      }),

    // Confirm order (change status to confirmed)
    confirm: publicProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ input }) => {
        await updateOrder(input.orderId, { status: "confirmed" });
        return { success: true };
      }),

    // Create order directly (dealer portal - no inquiry form)
    createDirect: dealerProcedure
      .input(z.object({
        items: z.array(z.object({
          sku: z.string(),
          productName: z.string(),
          quantity: z.number(),
          unitPrice: z.number(),
          unit: z.string(),
        })),
        deliveryAddress: z.string().min(1),
        deliveryDate: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get dealer info from context
        const dealerId = ctx.user.dealerId;
        if (!dealerId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Dealer profile not found' });
        }
        
        const dealer = await getDealerById(dealerId);
        if (!dealer) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Dealer not found' });
        }

        // Generate order number
        const orderNumber = await generateOrderNumber();
        
        // Calculate totals
        const subtotal = input.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const tax = subtotal * 0.08;
        const total = subtotal + tax;

        // Build raw inquiry text from items for record keeping
        const rawInquiry = input.items.map(item => 
          `${item.quantity} x ${item.productName} (${item.sku})`
        ).join(', ');

        // Create inquiry silently in background
        const inquiryId = await createInquiry({
          rawInquiry,
          dealerId,
          dealerName: dealer.name,
          dealerEmail: dealer.email,
          dealerPhone: dealer.phone,
          status: "converted",
          parsedData: {
            items: input.items.map(item => ({
              productName: item.productName,
              quantity: item.quantity,
              matchedProduct: { sku: item.sku },
            })),
            deliveryDate: input.deliveryDate || null,
            deliveryAddress: input.deliveryAddress,
            confidence: 1.0,
          } as any,
        });

        // Create order
        const orderId = await createOrder({
          orderNumber,
          inquiryId,
          dealerId,
          dealerName: dealer.name,
          dealerEmail: dealer.email,
          dealerPhone: dealer.phone,
          deliveryAddress: input.deliveryAddress,
          requestedDeliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : null,
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
          status: "pending",
          notes: input.notes || null,
        });

        // Create order items
        await createOrderItems(input.items.map(item => ({
          orderId,
          sku: item.sku,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
          lineTotal: (item.quantity * item.unitPrice).toFixed(2),
        })));

        return { orderId, orderNumber };
      }),
  }),

  // ==================== DASHBOARD ROUTES ====================
  dashboard: router({
    stats: adminProcedure.query(async () => {
      return getDashboardStats();
    }),
  }),

  // ==================== DEALER ROUTES ====================
  dealer: router({
    // Get dealer profile
    profile: dealerProcedure.query(async ({ ctx }) => {
      if (!ctx.user.dealerId) {
        return null;
      }
      return getDealerById(ctx.user.dealerId);
    }),

    // Get dealer's inquiries
    inquiries: dealerProcedure.query(async ({ ctx }) => {
      if (!ctx.user.dealerId) {
        return [];
      }
      return getInquiriesByDealerId(ctx.user.dealerId);
    }),

    // Get dealer's orders
    orders: dealerProcedure.query(async ({ ctx }) => {
      if (!ctx.user.dealerId) {
        return [];
      }
      return getOrdersByDealerId(ctx.user.dealerId);
    }),
  }),

  // ==================== AI CHAT ROUTES ====================
  ai: router({
    chat: publicProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(["system", "user", "assistant"]),
          content: z.string(),
        })),
        context: z.object({
          dealerName: z.string().optional(),
          cartItems: z.array(z.any()).optional(),
          cartTotal: z.number().optional(),
        }).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { invokeLLM } = await import("./_core/llm");
        const products = await getAllProducts();
        
        // Build product context
        const productContext = products.map(p => 
          `${p.name} (SKU: ${p.sku}, $${p.unitPrice}/${p.unit}, Stock: ${p.stockQuantity}, Lead: ${p.leadTimeDays}d)`
        ).join('\n');
        
        // Build cart context
        const cartContext = input.context?.cartItems && input.context.cartItems.length > 0
          ? `\n\nCurrent cart:\n${input.context.cartItems.map((item: any) => 
              `- ${item.quantity}x ${item.name} ($${(item.unitPrice * item.quantity).toFixed(2)})`
            ).join('\n')}\nCart Total: $${input.context?.cartTotal?.toFixed(2) || '0.00'}`
          : '\n\nCart is empty.';
        
        // System message with full context
        const systemMessage = {
          role: "system" as const,
          content: `You are a helpful wholesale ordering assistant for UnidBox. You help dealers find products, check pricing/availability, and build orders.

Available Products:
${productContext}
${cartContext}

Dealer: ${input.context?.dealerName || 'Dealer'}

Guidelines:
1. When asked about products, provide accurate pricing and stock info from the catalog
2. When asked to add items, confirm what you'll add and suggest quantities
3. Be concise and helpful. Use markdown for formatting.
4. If a product isn't found, suggest similar alternatives
5. Always mention lead times for delivery planning
6. For order requests, extract: products, quantities, delivery date/location if mentioned`
        };
        
        // Filter out any existing system messages and add our context-rich one
        const userMessages = input.messages.filter(m => m.role !== "system");
        const messagesWithContext = [systemMessage, ...userMessages];
        
        try {
          const response = await invokeLLM({
            messages: messagesWithContext,
          });
          
          const content = response.choices?.[0]?.message?.content;
          const messageText = typeof content === 'string' 
            ? content 
            : Array.isArray(content) 
              ? content.map((c: any) => c.type === 'text' ? c.text : '').join('')
              : 'I apologize, I could not process your request.';
          
          // Parse for cart updates (simple pattern matching)
          const cartUpdates: any[] = [];
          const addPattern = /add(?:ing)?\s+(\d+)\s*(?:x|×)?\s*([\w\s]+?)(?:\s+to|$)/gi;
          let match;
          while ((match = addPattern.exec(messageText)) !== null) {
            const quantity = parseInt(match[1]);
            const productName = match[2].trim().toLowerCase();
            const matchedProduct = products.find(p => 
              p.name.toLowerCase().includes(productName) ||
              p.sku.toLowerCase().includes(productName)
            );
            if (matchedProduct) {
              cartUpdates.push({
                action: 'add',
                product: matchedProduct,
                quantity,
              });
            }
          }
          
          return {
            message: messageText,
            cartUpdates,
            suggestedActions: cartUpdates.length > 0 ? ['Proceed to Order', 'Clear Cart'] : [],
          };
        } catch (error) {
          console.error('[AI Chat] Error:', error);
          return {
            message: "I'm sorry, I encountered an error processing your request. Please try again.",
            cartUpdates: [],
            suggestedActions: [],
          };
        }
      }),
  }),

  // ==================== ADMIN ROUTES ====================
  admin: router({
    // Get all inquiries
    inquiries: adminProcedure
      .input(z.object({
        status: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return getAllInquiries(input);
      }),

    // Get all orders
    orders: adminProcedure
      .input(z.object({
        status: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return getAllOrders(input);
      }),

    // Get DO history
    doHistory: adminProcedure.query(async () => {
      return getOrdersWithDO();
    }),

    // Update inquiry quote/status
    updateInquiryStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "parsed", "quoted", "converted", "rejected"]),
      }))
      .mutation(async ({ input }) => {
        await updateInquiry(input.id, { status: input.status });
        return { success: true };
      }),

    // Generate DO for order
    generateOrderDO: adminProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ input }) => {
        const order = await getOrderById(input.orderId);
        if (!order) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        }

        const items = await getOrderItems(input.orderId);
        
        const doData = generateDeliveryOrderData(
          order.orderNumber,
          order.dealerName || order.companyName || 'Anonymous Dealer',
          order.dealerEmail || undefined,
          order.dealerPhone || undefined,
          order.deliveryAddress || undefined,
          order.requestedDeliveryDate?.toISOString().split('T')[0],
          items.map(item => ({
            sku: item.sku,
            productName: item.productName,
            quantity: item.quantity,
            unit: "pcs",
            unitPrice: parseFloat(item.unitPrice as string),
          })),
          order.notes || undefined
        );

        // Update order with DO generation timestamp
        await updateOrder(input.orderId, {
          doGeneratedAt: new Date(),
        });

        return doData;
      }),
  }),
});

export type AppRouter = typeof appRouter;
