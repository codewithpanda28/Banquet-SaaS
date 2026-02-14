import { OrderWithDetails } from '@/types'
import { format } from 'date-fns'

export function printBill(order: OrderWithDetails): void {
    const billContent = `
    <html>
    <head>
      <title>Bill ${order.bill_id}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body { 
          font-family: 'Courier New', monospace; 
          font-size: 12px; 
          width: 80mm; 
          margin: 0 auto;
          padding: 10px;
          background: white;
        }
        
        .center { 
          text-align: center; 
        }
        
        .bold { 
          font-weight: bold; 
        }
        
        .line { 
          border-bottom: 1px dashed #000; 
          margin: 10px 0; 
        }
        
        .row { 
          display: flex; 
          justify-content: space-between; 
          margin: 3px 0;
        }
        
        .items { 
          margin: 10px 0; 
        }
        
        .item-header {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .item-row { 
          display: flex; 
          justify-content: space-between; 
          margin: 5px 0;
          font-size: 11px;
        }
        
        .item-name {
          flex: 2;
          padding-right: 5px;
        }
        
        .item-qty {
          flex: 0.5;
          text-align: center;
        }
        
        .item-price {
          flex: 1;
          text-align: right;
        }
        
        .total-section { 
          margin-top: 10px; 
        }
        
        .grand-total { 
          font-size: 16px; 
          font-weight: bold; 
          margin-top: 10px; 
        }
        
        h2 {
          margin: 5px 0;
          font-size: 18px;
        }
        
        p {
          margin: 2px 0;
        }
        
        @media print {
          @page { 
            margin: 0;
            size: 80mm auto;
          }
          body { 
            padding: 5mm;
          }
        }
      </style>
    </head>
    <body>
      <div class="center">
        <h2>${order.restaurant_name || 'Restaurant'}</h2>
        ${order.restaurant_address ? `<p>${order.restaurant_address}</p>` : ''}
        ${order.restaurant_phone ? `<p>Tel: ${order.restaurant_phone}</p>` : ''}
      </div>
      
      <div class="line"></div>
      
      <div class="row">
        <span>Bill No:</span>
        <span class="bold">${order.bill_id}</span>
      </div>
      <div class="row">
        <span>Date:</span>
        <span>${format(new Date(order.created_at), 'dd/MM/yyyy hh:mm a')}</span>
      </div>
      <div class="row">
        <span>Type:</span>
        <span>${order.order_type.replace(/_/g, ' ').toUpperCase()}</span>
      </div>
      ${order.table_number ? `
      <div class="row">
        <span>Table:</span>
        <span>TABLE ${order.table_number}</span>
      </div>
      ` : ''}
      ${order.customer_name ? `
      <div class="row">
        <span>Customer:</span>
        <span>${order.customer_name}</span>
      </div>
      ` : ''}
      ${order.customer_phone ? `
      <div class="row">
        <span>Phone:</span>
        <span>${order.customer_phone}</span>
      </div>
      ` : ''}
      
      <div class="line"></div>
      
      <div class="items">
        <div class="item-header">
          <span class="item-name">Item</span>
          <span class="item-qty">Qty</span>
          <span class="item-price">Amount</span>
        </div>
        ${order.items.map(item => `
          <div class="item-row">
            <span class="item-name">${item.item_name}</span>
            <span class="item-qty">${item.quantity}</span>
            <span class="item-price">₹${item.total.toFixed(2)}</span>
          </div>
          ${item.special_instructions ? `
          <div style="font-size: 10px; color: #666; margin-left: 5px;">
            Note: ${item.special_instructions}
          </div>
          ` : ''}
        `).join('')}
      </div>
      
      <div class="line"></div>
      
      <div class="total-section">
        <div class="row">
          <span>Subtotal:</span>
          <span>₹${order.subtotal.toFixed(2)}</span>
        </div>
        <div class="row">
          <span>Tax (${order.tax_percentage || 5}%):</span>
          <span>₹${order.tax.toFixed(2)}</span>
        </div>
        ${order.delivery_charge > 0 ? `
        <div class="row">
          <span>Delivery:</span>
          <span>₹${order.delivery_charge.toFixed(2)}</span>
        </div>
        ` : ''}
        ${order.discount > 0 ? `
        <div class="row">
          <span>Discount:</span>
          <span class="bold">-₹${order.discount.toFixed(2)}</span>
        </div>
        ` : ''}
      </div>
      
      <div class="line"></div>
      
      <div class="row grand-total">
        <span>TOTAL:</span>
        <span>₹${order.total.toFixed(2)}</span>
      </div>
      
      ${order.payment_method ? `
      <div class="row">
        <span>Payment:</span>
        <span>${order.payment_method.toUpperCase()} - ${order.payment_status.toUpperCase()}</span>
      </div>
      ` : ''}
      
      ${order.special_instructions ? `
      <div class="line"></div>
      <div style="margin: 10px 0;">
        <div class="bold">Special Instructions:</div>
        <div style="font-size: 11px; margin-top: 5px;">${order.special_instructions}</div>
      </div>
      ` : ''}
      
      <div class="line"></div>
      
      <div class="center">
        <p>Thank you for dining with us!</p>
        <p>Visit again 😊</p>
      </div>
    </body>
    </html>
  `

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
        console.error('Failed to open print window')
        return
    }

    printWindow.document.write(billContent)
    printWindow.document.close()

    // Wait a bit for content to load, then print
    setTimeout(() => {
        printWindow.print()
    }, 250)
}
