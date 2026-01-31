import { notifyOwner } from "./_core/notification";

export interface OrderEmailData {
  orderNumber: string;
  dealerName: string;
  dealerEmail: string;
  deliveryAddress: string;
  deliveryDate: string;
  items: Array<{
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

/**
 * Send order confirmation notification to the store owner
 * This uses the Manus notification system to alert the owner about new orders
 */
export async function sendOrderNotification(data: OrderEmailData): Promise<boolean> {
  const itemsList = data.items
    .map(item => `• ${item.productName} (${item.sku}) x${item.quantity} @ $${item.unitPrice.toFixed(2)} = $${item.lineTotal.toFixed(2)}`)
    .join('\n');

  const content = `
**New Order Received: ${data.orderNumber}**

**Customer Details:**
- Name: ${data.dealerName}
- Email: ${data.dealerEmail}

**Delivery Information:**
- Address: ${data.deliveryAddress}
- Requested Date: ${data.deliveryDate}

**Order Items:**
${itemsList}

**Order Summary:**
- Subtotal: $${data.subtotal.toFixed(2)}
- Tax: $${data.tax.toFixed(2)}
- **Total: $${data.total.toFixed(2)}**

${data.notes ? `**Notes:** ${data.notes}` : ''}

---
View this order in the admin dashboard to process and generate the Delivery Order.
`.trim();

  try {
    const result = await notifyOwner({
      title: `🛒 New Order: ${data.orderNumber} - $${data.total.toFixed(2)}`,
      content,
    });
    return result;
  } catch (error) {
    console.error('[Email] Failed to send order notification:', error);
    return false;
  }
}

/**
 * Send order status update notification
 */
export async function sendOrderStatusNotification(
  orderNumber: string,
  dealerName: string,
  newStatus: string,
  total: number
): Promise<boolean> {
  const statusMessages: Record<string, string> = {
    confirmed: 'Your order has been confirmed and is being prepared.',
    processing: 'Your order is now being processed.',
    shipped: 'Your order has been shipped and is on its way!',
    delivered: 'Your order has been delivered. Thank you for your business!',
    cancelled: 'Your order has been cancelled.',
  };

  const message = statusMessages[newStatus] || `Order status updated to: ${newStatus}`;

  try {
    const result = await notifyOwner({
      title: `📦 Order ${orderNumber} - ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
      content: `
**Order Status Update**

Order: ${orderNumber}
Customer: ${dealerName}
New Status: ${newStatus.toUpperCase()}
Total: $${total.toFixed(2)}

${message}
`.trim(),
    });
    return result;
  } catch (error) {
    console.error('[Email] Failed to send status notification:', error);
    return false;
  }
}
