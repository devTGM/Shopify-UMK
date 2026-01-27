/**
 * eShopaid Integration Service
 * Main entry point for all eShopaid API operations
 */

const config = require('./config');
const tokenManager = require('./token-manager');
const inventoryService = require('./inventory-service');
const orderService = require('./order-service');
const customerService = require('./customer-service');
const webhookHandlers = require('./webhook-handlers');

/**
 * eShopaid Integration Module
 * Provides unified access to all eShopaid API operations
 */
const eshopaid = {
    // Configuration
    config,

    // Token management
    token: tokenManager,

    // Core services
    inventory: inventoryService,
    orders: orderService,
    customers: customerService,

    // Webhook handlers
    webhooks: webhookHandlers,

    /**
     * Test API connectivity
     * @returns {Promise<object>} Connection test result
     */
    async testConnection() {
        try {
            console.log('[eShopaid] Testing API connection...');

            // Try to get a token
            const token = await tokenManager.getToken();

            if (token) {
                console.log('[eShopaid] Connection successful - token obtained');
                return {
                    success: true,
                    message: 'Connected to eShopaid API successfully',
                    serverUrl: config.eshopaid.serverUrl,
                };
            }

            return {
                success: false,
                message: 'Failed to obtain token',
            };
        } catch (error) {
            console.error('[eShopaid] Connection test failed:', error.message);
            return {
                success: false,
                message: error.message,
                serverUrl: config.eshopaid.serverUrl,
            };
        }
    },

    /**
     * Quick sync operations
     */
    sync: {
        /**
         * Sync a Shopify order to eShopaid
         * @param {object} shopifyOrder - Shopify order object
         * @returns {Promise<object>} Result
         */
        async order(shopifyOrder) {
            return await webhookHandlers.handleOrderCreate(shopifyOrder);
        },

        /**
         * Sync inventory from eShopaid
         * @param {string} location - Store location (optional)
         * @returns {Promise<object>} Inventory data
         */
        async inventory(location) {
            return await webhookHandlers.triggerInventorySync(location);
        },

        /**
         * Sync a customer to eShopaid
         * @param {object} shopifyCustomer - Shopify customer
         * @param {string} existingCode - Existing eShopaid code (optional)
         * @returns {Promise<object>} Result
         */
        async customer(shopifyCustomer, existingCode = null) {
            return await customerService.syncFromShopify(shopifyCustomer, existingCode);
        },
    },
};

module.exports = eshopaid;
