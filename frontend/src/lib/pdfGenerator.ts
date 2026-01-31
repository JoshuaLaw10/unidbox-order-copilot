import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface DeliveryOrderData {
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

export function generateDeliveryOrderPDF(data: DeliveryOrderData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors
  const primaryColor: [number, number, number] = [67, 56, 202]; // Indigo
  const textColor: [number, number, number] = [31, 41, 55];
  const mutedColor: [number, number, number] = [107, 114, 128];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, "F");
  
  // Logo/Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("UnidBox", 20, 25);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Wholesale Distribution", 20, 32);

  // DO Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("DELIVERY ORDER", pageWidth - 20, 20, { align: "right" });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(data.orderNumber, pageWidth - 20, 28, { align: "right" });
  
  doc.setFontSize(9);
  doc.text(`Date: ${data.orderDate}`, pageWidth - 20, 35, { align: "right" });

  // Reset text color
  doc.setTextColor(...textColor);

  // Bill To / Ship To Section
  const infoY = 55;
  
  // Bill To Box
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(15, infoY, 85, 45, 3, 3, "F");
  
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  doc.text("BILL TO", 20, infoY + 10);
  
  doc.setTextColor(...textColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(data.dealerName, 20, infoY + 20);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let billY = infoY + 27;
  if (data.dealerEmail) {
    doc.text(data.dealerEmail, 20, billY);
    billY += 6;
  }
  if (data.dealerPhone) {
    doc.text(data.dealerPhone, 20, billY);
  }

  // Ship To Box
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(110, infoY, 85, 45, 3, 3, "F");
  
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  doc.text("SHIP TO", 115, infoY + 10);
  
  doc.setTextColor(...textColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(data.deliveryAddress || data.dealerName, 115, infoY + 20, { maxWidth: 75 });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (data.requestedDeliveryDate) {
    doc.text(`Delivery: ${data.requestedDeliveryDate}`, 115, infoY + 35);
  }

  // Items Table
  const tableY = infoY + 55;
  
  const tableData = data.items.map((item) => [
    item.sku,
    item.productName,
    `${item.quantity} ${item.unit}`,
    `$${item.unitPrice.toFixed(2)}`,
    `$${item.lineTotal.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: tableY,
    head: [["SKU", "Description", "Qty", "Unit Price", "Amount"]],
    body: tableData,
    theme: "plain",
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: textColor,
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 5,
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 5,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 70 },
      2: { cellWidth: 25, halign: "right" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    margin: { left: 15, right: 15 },
  });

  // Get the final Y position after the table
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Totals Section
  const totalsX = pageWidth - 80;
  let totalsY = finalY;

  doc.setFontSize(10);
  doc.setTextColor(...mutedColor);
  doc.text("Subtotal", totalsX, totalsY);
  doc.setTextColor(...textColor);
  doc.text(`$${data.subtotal.toFixed(2)}`, pageWidth - 20, totalsY, { align: "right" });

  totalsY += 8;
  doc.setTextColor(...mutedColor);
  doc.text("Tax", totalsX, totalsY);
  doc.setTextColor(...textColor);
  doc.text(`$${data.tax.toFixed(2)}`, pageWidth - 20, totalsY, { align: "right" });

  totalsY += 3;
  doc.setDrawColor(229, 231, 235);
  doc.line(totalsX - 5, totalsY, pageWidth - 15, totalsY);

  totalsY += 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Total", totalsX, totalsY);
  doc.setTextColor(...primaryColor);
  doc.text(`$${data.total.toFixed(2)}`, pageWidth - 20, totalsY, { align: "right" });

  // Notes Section (if any)
  if (data.notes) {
    totalsY += 20;
    doc.setTextColor(...mutedColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Notes:", 15, totalsY);
    doc.setTextColor(...textColor);
    doc.text(data.notes, 15, totalsY + 6, { maxWidth: pageWidth - 30 });
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(229, 231, 235);
  doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);
  
  doc.setTextColor(...mutedColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for your business!", pageWidth / 2, footerY, { align: "center" });
  doc.text(
    "UnidBox Wholesale Distribution • AI-Powered Order Automation",
    pageWidth / 2,
    footerY + 5,
    { align: "center" }
  );

  // Save the PDF
  doc.save(`DO-${data.orderNumber}.pdf`);
}
