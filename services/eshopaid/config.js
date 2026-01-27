/**
 * eShopaid API Configuration
 * Loads configuration from environment variables
 */

require('dotenv').config();

const config = {
  // eShopaid API Settings
  eshopaid: {
    serverUrl: process.env.ESHOPAID_SERVER_URL || 'http://localhost/eShopaidService.svc',
    tokenEndpoint: '/Token',
    processDataEndpoint: '/ProcessData',
    username: process.env.ESHOPAID_USERNAME || 'Wondersoft',
    password: process.env.ESHOPAID_PASSWORD || 'Wondersoft#12',
    storeLocation: process.env.ESHOPAID_STORE_LOCATION || 'HO',
    sourceChannel: process.env.ESHOPAID_SOURCE_CHANNEL || 'Shopify',
    tokenLifetimeMinutes: 30,
    tokenRefreshBuffer: 5, // Refresh 5 minutes before expiry
  },

  // Shopify Settings
  shopify: {
    storeUrl: process.env.SHOPIFY_STORE_URL,
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
    apiVersion: process.env.SHOPIFY_API_VERSION || '2024-01',
  },

  // Sync Settings
  sync: {
    inventoryIntervalMinutes: parseInt(process.env.INVENTORY_SYNC_INTERVAL_MINUTES) || 15,
  },

  // Service Method Names (as per API documentation)
  methods: {
    GET_TOKEN: 'GetToken',
    GET_INVENTORY: 'GetInventory',
    ADD_CUSTOMER: 'AddCustomer',
    MODIFY_CUSTOMER: 'ModifyCustomer',
    CREATE_SALES_ORDER: 'CreateSalesOrder',
    GET_ORDER_DETAIL: 'GetOrderDetail',
    CREATE_RETURN_ORDER: 'CreateReturnOrder',
    SET_ORDER_STATUS: 'SetOrderStatus',
  },
};

module.exports = config;
