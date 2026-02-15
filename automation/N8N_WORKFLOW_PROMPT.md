# Comprehensive n8n WhatsApp Bot Prompt

Copy and paste the text below into the **n8n AI Assistant** to generate your complete restaurant automation workflow.

***

**PROMPT START**

Create a comprehensive WhatsApp Automation Workflow for a Restaurant with the following logic:

**1. Trigger:**
*   Create a **Webhook** node (POST) to receive incoming WhatsApp messages.
*   The input data will contain the `message_body` and `sender_phone`.

**2. Routing Logic (Switch/If Nodes):**
Analyze the `message_body` content to handle three scenarios:

*   **Scenario A: Dine-In Service**
    *   **Condition:** If the message contains the word "Table" (e.g., "I am at Table 5").
    *   **Action 1:** Use a Code/Regex node to extract the **Table Number** (digits).
    *   **Action 2:** Save the customer (Phone, Name) to Supabase.
    *   **Action 3:** Reply with a text message: 
        > "Welcome! 🍽️ 
        > Tap here to order for Table {{table_number}}: 
        > http://localhost:3002/menu?table={{table_number}}&type=dine_in"

*   **Scenario B: Takeaway / Pickup**
    *   **Condition:** If the message contains "Takeaway" or "Pickup".
    *   **Action 1:** Save the customer to Supabase.
    *   **Action 2:** Reply with a text message:
        > "Order for Pickup! 🛍️ 
        > Tap here to view our Takeaway Menu: 
        > http://localhost:3002/menu?type=takeaway"

*   **Scenario C: Home Delivery**
    *   **Condition:** If the message contains "Delivery" or "Home".
    *   **Action 1:** Save the customer to Supabase.
    *   **Action 2:** Reply with a text message:
        > "Order for Delivery! 🛵 
        > Tap here to view our Delivery Menu: 
        > http://localhost:3002/menu?type=delivery"

*   **Scenario D: Default / Greeting**
    *   **Condition:** If the message matches none of the above (e.g., "Hi", "Hello").
    *   **Action:** Send a "Menu Options" message (Interactive List or Buttons) with 3 options:
        1.  "Dine-in Order"
        2.  "Takeaway"
        3.  "Home Delivery"

**3. Database (Supabase):**
*   For all scenarios, ensure the customer's phone number and last visit time are updated in the `customers` table.

**PROMPT END**

***

## Important Configuration Notes

1.  **URL Replacement:** 
    *   The prompt uses `http://localhost:3002`. You **must** replace this with your actual live website URL (e.g., `https://your-restaurant-app.vercel.app`) inside n8n after the workflow is generated.

2.  **QR Code Setup:**
    *   **Dine-In:** Use the "Tables" page in Admin Dashboard. I have updated it to generate WhatsApp-ready QR codes.
    *   **Takeaway/Delivery:** You can create a generic QR code (using any free generator) that contains a `wa.me` link:
        *   **Takeaway QR:** `https://wa.me/917282871506?text=I%20want%20Takeaway`
        *   **Delivery QR:** `https://wa.me/917282871506?text=I%20want%20Home%20Delivery`
    *   *(Replace `917282871506` with your restaurant's WhatsApp number)*
