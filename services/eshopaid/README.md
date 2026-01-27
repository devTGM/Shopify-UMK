# eShopaid Integration Service

Integration service for syncing Shopify orders, customers, and inventory with Wondersoft eShopaid ERP.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

3. **Test connection:**
   ```bash
   npm test
   ```

4. **Start server:**
   ```bash
   npm start
   # or for development:
   npm run dev
   ```

## Configuration

Edit `.env` file with your settings:

| Variable | Description |
|----------|-------------|
| `ESHOPAID_SERVER_URL` | eShopaid API server URL |
| `ESHOPAID_USERNAME` | API username |
| `ESHOPAID_PASSWORD` | API password |
| `ESHOPAID_STORE_LOCATION` | Your store code in eShopaid |
| `SHOPIFY_STORE_URL` | Your Shopify store URL |
| `SHOPIFY_ACCESS_TOKEN` | Shopify Admin API token |

## Webhook Endpoints

Register these in your Shopify Admin → Settings → Notifications:

| Shopify Event | Webhook URL |
|---------------|-------------|
| Order creation | `https://your-server/webhooks/orders/create` |
| Order update | `https://your-server/webhooks/orders/updated` |
| Order cancellation | `https://your-server/webhooks/orders/cancelled` |
| Customer creation | `https://your-server/webhooks/customers/create` |
| Refund creation | `https://your-server/webhooks/refunds/create` |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/test-connection` | GET | Test eShopaid connection |
| `/api/inventory` | GET | Fetch inventory |
| `/api/sync/order` | POST | Manually sync an order |
| `/api/sync/inventory` | POST | Trigger inventory sync |

## Features

- ✅ Token management with auto-refresh
- ✅ Order sync (Shopify → eShopaid)
- ✅ Inventory sync (eShopaid → Shopify)
- ✅ Customer sync
- ✅ Return order creation
- ✅ Order status updates
- ✅ Scheduled inventory sync (configurable interval)
- ✅ GST state code mapping for Indian orders
