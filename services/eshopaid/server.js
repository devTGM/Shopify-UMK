/**
 * eShopaid Integration Server
 * Express server for handling Shopify webhooks
 */

require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const eshopaid = require('./index');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies
app.use(express.json({
    verify: (req, res, buf) => {
        // Store raw body for webhook verification
        req.rawBody = buf;
    }
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'eshopaid-integration' });
});

// Test connection endpoint
app.get('/api/test-connection', async (req, res) => {
    try {
        const result = await eshopaid.testConnection();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Inventory sync endpoint
app.get('/api/inventory', async (req, res) => {
    try {
        const location = req.query.location;
        const result = await eshopaid.sync.inventory(location);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Webhook: orders/create
app.post('/webhooks/orders/create', async (req, res) => {
    try {
        const order = req.body;
        console.log(`[Server] Received order create webhook: ${order.name}`);

        // Respond immediately to Shopify
        res.status(200).send('OK');

        // Process webhook asynchronously
        const result = await eshopaid.webhooks.handleOrderCreate(order);
        console.log('[Server] Order sync result:', result);
    } catch (error) {
        console.error('[Server] Order webhook error:', error.message);
        res.status(500).send('Error');
    }
});

// Webhook: orders/updated
app.post('/webhooks/orders/updated', async (req, res) => {
    try {
        const order = req.body;
        console.log(`[Server] Received order update webhook: ${order.name}`);

        res.status(200).send('OK');

        const result = await eshopaid.webhooks.handleOrderUpdate(order);
        console.log('[Server] Order update result:', result);
    } catch (error) {
        console.error('[Server] Order update webhook error:', error.message);
        res.status(500).send('Error');
    }
});

// Webhook: orders/cancelled
app.post('/webhooks/orders/cancelled', async (req, res) => {
    try {
        const order = req.body;
        console.log(`[Server] Received order cancelled webhook: ${order.name}`);

        res.status(200).send('OK');

        const result = await eshopaid.webhooks.handleOrderCancelled(order);
        console.log('[Server] Order cancellation result:', result);
    } catch (error) {
        console.error('[Server] Order cancellation webhook error:', error.message);
        res.status(500).send('Error');
    }
});

// Webhook: customers/create
app.post('/webhooks/customers/create', async (req, res) => {
    try {
        const customer = req.body;
        console.log(`[Server] Received customer create webhook: ${customer.email}`);

        res.status(200).send('OK');

        const result = await eshopaid.webhooks.handleCustomerCreate(customer);
        console.log('[Server] Customer sync result:', result);
    } catch (error) {
        console.error('[Server] Customer webhook error:', error.message);
        res.status(500).send('Error');
    }
});

// Webhook: refunds/create
app.post('/webhooks/refunds/create', async (req, res) => {
    try {
        const data = req.body;
        console.log(`[Server] Received refund create webhook`);

        res.status(200).send('OK');

        // Note: You'll need to fetch the original order from Shopify
        // This is a simplified version
        const result = await eshopaid.webhooks.handleRefundCreate(data.refund, data.order);
        console.log('[Server] Refund sync result:', result);
    } catch (error) {
        console.error('[Server] Refund webhook error:', error.message);
        res.status(500).send('Error');
    }
});

// Manual sync endpoints
app.post('/api/sync/inventory', async (req, res) => {
    try {
        const { location } = req.body;
        const result = await eshopaid.sync.inventory(location);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/sync/order', async (req, res) => {
    try {
        const order = req.body;
        const result = await eshopaid.sync.order(order);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Schedule periodic inventory sync
const syncIntervalMinutes = eshopaid.config.sync.inventoryIntervalMinutes;
if (syncIntervalMinutes > 0) {
    cron.schedule(`*/${syncIntervalMinutes} * * * *`, async () => {
        console.log('[Cron] Running scheduled inventory sync...');
        try {
            const result = await eshopaid.sync.inventory();
            console.log(`[Cron] Synced ${result.itemCount || 0} items`);
        } catch (error) {
            console.error('[Cron] Inventory sync failed:', error.message);
        }
    });
    console.log(`[Server] Inventory sync scheduled every ${syncIntervalMinutes} minutes`);
}

// Start server
app.listen(PORT, () => {
    console.log(`[Server] eShopaid Integration Service running on port ${PORT}`);
    console.log(`[Server] Webhook endpoints available at /webhooks/*`);
    console.log(`[Server] API endpoints available at /api/*`);
});

module.exports = app;
