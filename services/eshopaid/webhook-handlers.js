/**
 * Webhook Handlers for Shopify Events
 * Processes incoming webhooks and syncs with eShopaid
 */

const crypto = require('crypto');
const orderService = require('./order-service');
const customerService = require('./customer-service');
const inventoryService = require('./inventory-service');

class WebhookHandlers {
    /**
     * Verify Shopify webhook signature
     * @param {string} body - Raw request body
     * @param {string} hmacHeader - X-Shopify-Hmac-Sha256 header
     * @param {string} secret - Shopify webhook secret
     * @returns {boolean} Is valid
     */
    verifyWebhook(body, hmacHeader, secret) {
        const hash = crypto
            .createHmac('sha256', secret)
            .update(body, 'utf8')
            .digest('base64');

        return hash === hmacHeader;
    }

    /**
     * Handle orders/create webhook
     * @param {object} order - Shopify order object
     * @returns {Promise<object>} Result
     */
    async handleOrderCreate(order) {
        console.log(`[Webhook] Order created: ${order.name}`);

        try {
            // Create customer in eShopaid if doesn't exist
            if (order.customer) {
                try {
                    await customerService.syncFromShopify(order.customer);
                } catch (customerError) {
                    console.warn('[Webhook] Customer sync failed:', customerError.message);
                    // Continue with order creation even if customer sync fails
                }
            }

            // Create order in eShopaid
            const result = await orderService.createSalesOrder(order);

            if (result.success) {
                console.log(`[Webhook] Order ${order.name} synced to eShopaid successfully`);
                return {
                    success: true,
                    orderId: order.id,
                    eshopaidRef: result.data?.TargetRefID,
                };
            } else {
                console.error(`[Webhook] Order sync failed: ${result.error}`);
                return {
                    success: false,
                    orderId: order.id,
                    error: result.error,
                };
            }
        } catch (error) {
            console.error(`[Webhook] Order creation error:`, error.message);
            return {
                success: false,
                orderId: order.id,
                error: error.message,
            };
        }
    }

    /**
     * Handle orders/updated webhook
     * @param {object} order - Shopify order object
     * @returns {Promise<object>} Result
     */
    async handleOrderUpdate(order) {
        console.log(`[Webhook] Order updated: ${order.name}`);

        try {
            // Determine new status based on Shopify order state
            let status = null;

            if (order.cancelled_at) {
                status = 'CANCELLED';
            } else if (order.fulfillment_status === 'fulfilled') {
                status = 'DELIVERED';
            } else if (order.fulfillment_status === 'partial') {
                status = 'PARTIALLY_DELIVERED';
            } else if (order.financial_status === 'paid') {
                status = 'PAID';
            }

            if (status) {
                const orderDate = new Date(order.created_at).toISOString().slice(0, 10);
                const result = await orderService.setOrderStatus(
                    order.name,
                    orderDate,
                    status
                );

                return {
                    success: result.success,
                    orderId: order.id,
                    status: status,
                    error: result.error,
                };
            }

            return { success: true, orderId: order.id, status: 'NO_UPDATE_NEEDED' };
        } catch (error) {
            console.error(`[Webhook] Order update error:`, error.message);
            return {
                success: false,
                orderId: order.id,
                error: error.message,
            };
        }
    }

    /**
     * Handle orders/cancelled webhook
     * @param {object} order - Shopify order object
     * @returns {Promise<object>} Result
     */
    async handleOrderCancelled(order) {
        console.log(`[Webhook] Order cancelled: ${order.name}`);

        try {
            const orderDate = new Date(order.created_at).toISOString().slice(0, 10);
            const result = await orderService.setOrderStatus(
                order.name,
                orderDate,
                'CANCELLED'
            );

            return {
                success: result.success,
                orderId: order.id,
                error: result.error,
            };
        } catch (error) {
            console.error(`[Webhook] Order cancellation error:`, error.message);
            return {
                success: false,
                orderId: order.id,
                error: error.message,
            };
        }
    }

    /**
     * Handle refunds/create webhook
     * @param {object} refund - Shopify refund object
     * @param {object} order - Original order object
     * @returns {Promise<object>} Result
     */
    async handleRefundCreate(refund, order) {
        console.log(`[Webhook] Refund created for order: ${order.name}`);

        try {
            const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const orderDate = new Date(order.created_at).toISOString().slice(0, 10).replace(/-/g, '');

            // Transform refund items
            const items = refund.refund_line_items.map((item, index) => ({
                LineNumber: index + 1,
                RefLineNumber: item.line_item_id,
                ItemCode: item.line_item?.sku || item.line_item?.variant_id?.toString(),
                Quantity: item.quantity,
                Rate: parseFloat(item.line_item?.price || 0),
                DiscountAmount: 0,
                LineRemarks: item.line_item?.name || '',
            }));

            // Create return order
            const returnData = {
                customer: order.customer ? {
                    TitleName: '',
                    FirstName: order.customer.first_name || 'Guest',
                    LastName: order.customer.last_name || '',
                    MobileNumber: order.customer.phone || order.shipping_address?.phone || '',
                    EmailID: order.customer.email || order.email || '',
                } : {},
                returnDate: today,
                returnOrderNumber: `RET${refund.id}`,
                refOrderDate: orderDate,
                refOrderNumber: order.name,
                totalValue: refund.transactions?.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0,
                remarks: refund.note || 'Shopify refund',
                items: items,
                payments: [{
                    PaymentMode: 'Refund',
                    PaymentValue: refund.transactions?.[0]?.amount || 0,
                    ModeType: '',
                    PaymentReference: refund.id.toString(),
                }],
            };

            const result = await orderService.createReturnOrder(returnData);

            return {
                success: result.success,
                refundId: refund.id,
                eshopaidRef: result.data?.TargetRefID,
                error: result.error,
            };
        } catch (error) {
            console.error(`[Webhook] Refund creation error:`, error.message);
            return {
                success: false,
                refundId: refund.id,
                error: error.message,
            };
        }
    }

    /**
     * Handle customers/create webhook
     * @param {object} customer - Shopify customer object
     * @returns {Promise<object>} Result
     */
    async handleCustomerCreate(customer) {
        console.log(`[Webhook] Customer created: ${customer.email}`);

        try {
            const result = await customerService.syncFromShopify(customer);

            return {
                success: result.success,
                customerId: customer.id,
                eshopaidCode: result.customerCode,
                error: result.error,
            };
        } catch (error) {
            console.error(`[Webhook] Customer creation error:`, error.message);
            return {
                success: false,
                customerId: customer.id,
                error: error.message,
            };
        }
    }

    /**
     * Handle customers/update webhook
     * @param {object} customer - Shopify customer object
     * @param {string} eshopaidCode - Existing eShopaid customer code
     * @returns {Promise<object>} Result
     */
    async handleCustomerUpdate(customer, eshopaidCode) {
        console.log(`[Webhook] Customer updated: ${customer.email}`);

        try {
            const result = await customerService.syncFromShopify(customer, eshopaidCode);

            return {
                success: result.success,
                customerId: customer.id,
                error: result.error,
            };
        } catch (error) {
            console.error(`[Webhook] Customer update error:`, error.message);
            return {
                success: false,
                customerId: customer.id,
                error: error.message,
            };
        }
    }

    /**
     * Trigger inventory sync
     * @param {string} location - Store location (optional)
     * @returns {Promise<object>} Inventory data
     */
    async triggerInventorySync(location) {
        console.log(`[Webhook] Inventory sync triggered`);

        try {
            const result = await inventoryService.getInventoryByLocation(location);

            if (result.success) {
                console.log(`[Webhook] Fetched ${result.totalItems} inventory items`);
                // Here you would sync to Shopify using the Admin API
                return {
                    success: true,
                    itemCount: result.totalItems,
                    inventory: result.inventoryByLocation,
                };
            }

            return {
                success: false,
                error: result.error,
            };
        } catch (error) {
            console.error(`[Webhook] Inventory sync error:`, error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }
}

module.exports = new WebhookHandlers();
