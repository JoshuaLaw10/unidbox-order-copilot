import { Resend } from 'resend';

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

// Sender email - using Resend's default for testing, can be customized with verified domain
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'UnidBox <onboarding@resend.dev>';

export interface CustomerOrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
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
 * Generate HTML email template for order confirmation
 */
function generateOrderConfirmationHTML(data: CustomerOrderEmailData): string {
  const itemsHTML = data.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <strong>${item.productName}</strong><br>
        <span style="color: #6b7280; font-size: 12px;">SKU: ${item.sku}</span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">$${item.lineTotal.toFixed(2)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - ${data.orderNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%); padding: 30px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #f97316; width: 50px; height: 50px; border-radius: 8px; line-height: 50px; margin-bottom: 10px;">
                      <span style="color: white; font-size: 24px;">📦</span>
                    </div>
                    <h1 style="color: #ffffff; margin: 10px 0 0 0; font-size: 24px; font-weight: 700;">UnidBox Hardware</h1>
                    <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;">Your One-Stop Hardware & Home Essentials</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Success Banner -->
          <tr>
            <td style="background-color: #ecfdf5; padding: 20px; text-align: center; border-bottom: 1px solid #d1fae5;">
              <div style="display: inline-block; background-color: #10b981; width: 40px; height: 40px; border-radius: 50%; line-height: 40px; margin-bottom: 10px;">
                <span style="color: white; font-size: 20px;">✓</span>
              </div>
              <h2 style="color: #065f46; margin: 0; font-size: 20px;">Order Confirmed!</h2>
              <p style="color: #047857; margin: 5px 0 0 0; font-size: 14px;">Thank you for your order. We're processing it now.</p>
            </td>
          </tr>

          <!-- Order Details -->
          <tr>
            <td style="padding: 30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px; border-bottom: 2px solid #f97316; padding-bottom: 10px;">Order Details</h3>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 5px 0; color: #6b7280;">Order Number:</td>
                        <td style="padding: 5px 0; text-align: right; font-weight: 600; color: #f97316;">${data.orderNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #6b7280;">Customer:</td>
                        <td style="padding: 5px 0; text-align: right; font-weight: 600;">${data.customerName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #6b7280;">Email:</td>
                        <td style="padding: 5px 0; text-align: right;">${data.customerEmail}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Delivery Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td>
                    <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px; border-bottom: 2px solid #f97316; padding-bottom: 10px;">Delivery Information</h3>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 5px 0; color: #6b7280;">Address:</td>
                        <td style="padding: 5px 0; text-align: right;">${data.deliveryAddress || 'Not specified'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #6b7280;">Requested Date:</td>
                        <td style="padding: 5px 0; text-align: right;">${data.deliveryDate || 'Not specified'}</td>
                      </tr>
                      ${data.notes ? `
                      <tr>
                        <td style="padding: 5px 0; color: #6b7280;">Notes:</td>
                        <td style="padding: 5px 0; text-align: right;">${data.notes}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Order Items -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td>
                    <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px; border-bottom: 2px solid #f97316; padding-bottom: 10px;">Order Items</h3>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                      <thead>
                        <tr style="background-color: #f9fafb;">
                          <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Product</th>
                          <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Qty</th>
                          <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Price</th>
                          <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itemsHTML}
                      </tbody>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Order Summary -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 20px;">
                <tr>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 5px 20px; color: #6b7280;">Subtotal:</td>
                        <td style="padding: 5px 20px; text-align: right;">$${data.subtotal.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 20px; color: #6b7280;">Tax:</td>
                        <td style="padding: 5px 20px; text-align: right;">$${data.tax.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 20px; font-size: 18px; font-weight: 700; color: #1f2937; border-top: 2px solid #e5e7eb;">Total:</td>
                        <td style="padding: 10px 20px; text-align: right; font-size: 18px; font-weight: 700; color: #f97316; border-top: 2px solid #e5e7eb;">$${data.total.toFixed(2)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1e3a5f; padding: 30px; text-align: center;">
              <p style="color: #94a3b8; margin: 0 0 10px 0; font-size: 14px;">
                Questions about your order? Contact us at<br>
                <a href="mailto:sales@unidbox.com" style="color: #f97316; text-decoration: none;">sales@unidbox.com</a> | 
                <a href="tel:+6565551234" style="color: #f97316; text-decoration: none;">+65 6555 1234</a>
              </p>
              <p style="color: #64748b; margin: 15px 0 0 0; font-size: 12px;">
                © 2026 UnidBox Hardware Pte. Ltd. All rights reserved.<br>
                80 Playfair Road #04-12, Singapore 367998
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Send order confirmation email to customer
 */
export async function sendCustomerOrderEmail(data: CustomerOrderEmailData): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[CustomerEmail] RESEND_API_KEY not configured, skipping email');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `Order Confirmation - ${data.orderNumber} | UnidBox Hardware`,
      html: generateOrderConfirmationHTML(data),
    });

    if (error) {
      console.error('[CustomerEmail] Failed to send:', error);
      return { success: false, error: error.message };
    }

    console.log('[CustomerEmail] Sent successfully:', result?.id);
    return { success: true };
  } catch (error) {
    console.error('[CustomerEmail] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send order status update email to customer
 */
export async function sendCustomerStatusEmail(
  customerEmail: string,
  customerName: string,
  orderNumber: string,
  newStatus: string,
  total: number
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[CustomerEmail] RESEND_API_KEY not configured, skipping email');
    return { success: false, error: 'Email service not configured' };
  }

  const statusMessages: Record<string, { emoji: string; message: string; color: string }> = {
    confirmed: { emoji: '✅', message: 'Your order has been confirmed and is being prepared for shipment.', color: '#10b981' },
    processing: { emoji: '⚙️', message: 'Your order is now being processed by our team.', color: '#3b82f6' },
    shipped: { emoji: '🚚', message: 'Great news! Your order has been shipped and is on its way to you.', color: '#8b5cf6' },
    delivered: { emoji: '📦', message: 'Your order has been delivered. Thank you for shopping with UnidBox!', color: '#10b981' },
    cancelled: { emoji: '❌', message: 'Your order has been cancelled. If you have questions, please contact us.', color: '#ef4444' },
  };

  const status = statusMessages[newStatus] || { emoji: '📋', message: `Your order status has been updated to: ${newStatus}`, color: '#6b7280' };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Order Update - ${orderNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">UnidBox Hardware</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 20px;">${status.emoji}</div>
              <h2 style="color: ${status.color}; margin: 0 0 10px 0; font-size: 24px; text-transform: uppercase;">${newStatus}</h2>
              <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 16px;">${status.message}</p>
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0; color: #6b7280;">Order Number</p>
                <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: 700; color: #f97316;">${orderNumber}</p>
                <p style="margin: 15px 0 0 0; color: #6b7280;">Order Total</p>
                <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 600;">$${total.toFixed(2)}</p>
              </div>
              <p style="color: #9ca3af; font-size: 14px; margin-top: 20px;">
                Hi ${customerName}, thank you for choosing UnidBox Hardware!
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1e3a5f; padding: 20px; text-align: center;">
              <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                © 2026 UnidBox Hardware Pte. Ltd.<br>
                <a href="mailto:sales@unidbox.com" style="color: #f97316;">sales@unidbox.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: `Order ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)} - ${orderNumber} | UnidBox Hardware`,
      html,
    });

    if (error) {
      console.error('[CustomerEmail] Failed to send status update:', error);
      return { success: false, error: error.message };
    }

    console.log('[CustomerEmail] Status update sent:', result?.id);
    return { success: true };
  } catch (error) {
    console.error('[CustomerEmail] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
