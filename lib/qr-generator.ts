import QRCode from 'qrcode'

export interface QRCodeOptions {
    width?: number
    margin?: number
    color?: {
        dark?: string
        light?: string
    }
}

// Generate QR Code as Data URL
export async function generateQRDataURL(
    url: string,
    options: QRCodeOptions = {}
): Promise<string> {
    const defaultOptions = {
        width: 300,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF',
        },
    }

    const qrOptions = { ...defaultOptions, ...options }

    try {
        const dataUrl = await QRCode.toDataURL(url, qrOptions)
        return dataUrl
    } catch (error) {
        console.error('Error generating QR code:', error)
        throw new Error('Failed to generate QR code')
    }
}

// Generate table QR code
export async function generateTableQR(tableNumber: number): Promise<string> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const menuUrl = `${baseUrl}/menu?table=${tableNumber}&type=dine_in`

    return generateQRDataURL(menuUrl, { width: 400 })
}

// Download QR Code
export function downloadQR(dataUrl: string, fileName: string): void {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `${fileName}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

// Print QR Code
export function printQR(
    dataUrl: string,
    tableNumber: number,
    restaurantName: string
): void {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
    <html>
      <head>
        <title>Table ${tableNumber} QR Code</title>
        <style>
          body { 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center;
            min-height: 100vh;
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
          }
          img { 
            width: 250px; 
            height: 250px; 
            border: 2px solid #000;
            padding: 10px;
          }
          h1 { 
            margin: 10px 0; 
            font-size: 24px; 
            text-align: center;
          }
          h2 { 
            margin: 20px 0 10px; 
            font-size: 32px; 
            text-align: center;
          }
          p { 
            margin: 5px 0; 
            color: #666; 
            text-align: center;
            font-size: 14px;
          }
          @media print {
            @page { margin: 0; }
            body { padding: 40px; }
          }
        </style>
      </head>
      <body>
        <h1>${restaurantName}</h1>
        <img src="${dataUrl}" alt="QR Code for Table ${tableNumber}" />
        <h2>Table ${tableNumber}</h2>
        <p>Scan to view menu & order</p>
      </body>
    </html>
  `)

    printWindow.document.close()

    // Wait for image to load before printing
    const img = printWindow.document.querySelector('img')
    if (img) {
        img.onload = () => {
            setTimeout(() => {
                printWindow.print()
            }, 250)
        }
    }
}
