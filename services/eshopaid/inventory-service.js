/**
 * Inventory Service for eShopaid API
 * Handles inventory synchronization between eShopaid and Shopify
 */

const axios = require('axios');
const config = require('./config');
const tokenManager = require('./token-manager');

class InventoryService {
    /**
     * Make an authenticated API request to eShopaid
     * @param {string} method - SERVICE_METHODNAME
     * @param {object} data - Request body
     * @returns {Promise<object>} Response data
     */
    async makeRequest(method, data) {
        const token = await tokenManager.getToken();
        const url = `${config.eshopaid.serverUrl}${config.eshopaid.processDataEndpoint}`;

        try {
            const response = await axios.post(url, data, {
                headers: {
                    'SERVICE_METHODNAME': method,
                    'AUTHORIZATION': token,
                    'Content-Type': 'application/json',
                },
            });

            return response.data;
        } catch (error) {
            console.error(`[InventoryService] API request failed:`, error.message);
            throw error;
        }
    }

    /**
     * Get inventory for all products at a location
     * @param {string} location - Store location code (AlternateStoreCode)
     * @returns {Promise<object>} Inventory data
     */
    async getInventoryByLocation(location = config.eshopaid.storeLocation) {
        const requestData = {
            Params: {
                Location: location,
                DateFilter: '',
                ProductCode: '',
            },
        };

        console.log(`[InventoryService] Fetching inventory for location: ${location}`);
        const response = await this.makeRequest(config.methods.GET_INVENTORY, requestData);

        return this.parseInventoryResponse(response);
    }

    /**
     * Get inventory for a specific product across all stores
     * @param {string} productCode - Product code (AlternateProductCode)
     * @returns {Promise<object>} Inventory data
     */
    async getInventoryByProduct(productCode) {
        const requestData = {
            Params: {
                Location: '',
                DateFilter: '',
                ProductCode: productCode,
            },
        };

        console.log(`[InventoryService] Fetching inventory for product: ${productCode}`);
        const response = await this.makeRequest(config.methods.GET_INVENTORY, requestData);

        return this.parseInventoryResponse(response);
    }

    /**
     * Get incremental inventory updates since a date
     * @param {string} dateFilter - Date in YYYYMMDD format
     * @param {string} location - Optional location filter
     * @returns {Promise<object>} Inventory data
     */
    async getIncrementalInventory(dateFilter, location = '') {
        const requestData = {
            Params: {
                Location: location,
                DateFilter: dateFilter,
                ProductCode: '',
            },
        };

        console.log(`[InventoryService] Fetching incremental inventory since: ${dateFilter}`);
        const response = await this.makeRequest(config.methods.GET_INVENTORY, requestData);

        return this.parseInventoryResponse(response);
    }

    /**
     * Get inventory for a list of SKUs
     * @param {string[]} skuCodes - Array of SKU/EAN codes
     * @param {string} location - Store location
     * @returns {Promise<object>} Inventory data
     */
    async getInventoryBySKUList(skuCodes, location = config.eshopaid.storeLocation) {
        const requestData = {
            Params: {
                Location: location,
                SKUList: {
                    SKUCode: skuCodes,
                },
            },
        };

        console.log(`[InventoryService] Fetching inventory for ${skuCodes.length} SKUs`);
        const response = await this.makeRequest(config.methods.GET_INVENTORY, requestData);

        return this.parseInventoryResponse(response);
    }

    /**
     * Parse inventory response into a normalized format
     * @param {object} response - Raw API response
     * @returns {object} Parsed inventory data
     */
    parseInventoryResponse(response) {
        const result = {
            success: false,
            inventoryByLocation: [],
            totalItems: 0,
            error: null,
        };

        // Handle JSON response format
        if (response.Response) {
            if (response.Response.Result === 'SUCCESS') {
                result.success = true;

                const inventoryData = response.Response.Data?.Inventory;
                if (Array.isArray(inventoryData)) {
                    result.inventoryByLocation = inventoryData.map(loc => ({
                        location: loc.Location,
                        items: this.normalizeItems(loc.Items?.Item),
                    }));
                } else if (inventoryData) {
                    result.inventoryByLocation = [{
                        location: inventoryData.Location,
                        items: this.normalizeItems(inventoryData.Items?.Item),
                    }];
                }

                result.totalItems = result.inventoryByLocation.reduce(
                    (sum, loc) => sum + loc.items.length, 0
                );
            } else {
                result.error = response.Response.FailureReason || 'Unknown error';
            }
        }

        return result;
    }

    /**
     * Normalize item data to consistent format
     * @param {object|array} items - Items from API response
     * @returns {array} Normalized items
     */
    normalizeItems(items) {
        if (!items) return [];

        const itemArray = Array.isArray(items) ? items : [items];

        return itemArray.map(item => ({
            productCode: item.ProductCode,
            eanCode: String(item.EANCode),
            itemCode: item.ItemCode,
            itemName: item.ItemName,
            mrp: parseFloat(item.MRP) || 0,
            stock: parseFloat(item.Stock) || 0,
            salesPrice: parseFloat(item.SalesPrice) || 0,
            taxRate: parseFloat(item.TaxRate) || 0,
            lastModified: item.LastModifiedOn,
            saleUnit: item.SaleUnit,
            perUnitPrice: parseFloat(item.PerUnitSalesPrice) || 0,
        }));
    }

    /**
     * Format inventory data for Shopify inventory update
     * @param {object} inventoryData - Parsed inventory data
     * @returns {array} Shopify-formatted inventory updates
     */
    formatForShopify(inventoryData) {
        const updates = [];

        for (const location of inventoryData.inventoryByLocation) {
            for (const item of location.items) {
                updates.push({
                    sku: item.eanCode || item.itemCode,
                    quantity: Math.floor(item.stock),
                    price: item.salesPrice,
                    compareAtPrice: item.mrp,
                });
            }
        }

        return updates;
    }
}

module.exports = new InventoryService();
