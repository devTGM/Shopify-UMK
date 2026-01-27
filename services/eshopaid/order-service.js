/**
 * Order Service for eShopaid API
 * Handles order creation, status updates, and returns
 */

const axios = require('axios');
const config = require('./config');
const tokenManager = require('./token-manager');

class OrderService {
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
            console.error(`[OrderService] API request failed:`, error.message);
            throw error;
        }
    }

    /**
     * Create a sales order in eShopaid from Shopify order
     * @param {object} shopifyOrder - Shopify order object
     * @returns {Promise<object>} eShopaid response
     */
    async createSalesOrder(shopifyOrder) {
        const orderData = this.transformShopifyOrder(shopifyOrder);

        console.log(`[OrderService] Creating order: ${shopifyOrder.name || shopifyOrder.order_number}`);
        const response = await this.makeRequest(config.methods.CREATE_SALES_ORDER, orderData);

        return this.parseOrderResponse(response);
    }

    /**
     * Transform Shopify order to eShopaid format
     * @param {object} order - Shopify order
     * @returns {object} eShopaid order format
     */
    transformShopifyOrder(order) {
        const customer = order.customer || {};
        const shippingAddress = order.shipping_address || order.billing_address || {};
        const billingAddress = order.billing_address || {};

        // Format date as YYYYMMDD
        const orderDate = new Date(order.created_at);
        const formattedDate = orderDate.toISOString().slice(0, 10).replace(/-/g, '');

        // Transform line items
        const items = order.line_items.map((item, index) => ({
            LineNumber: index + 1,
            ItemCode: item.sku || item.variant_id?.toString(),
            Quantity: item.quantity,
            Rate: parseFloat(item.price),
            DiscountAmount: parseFloat(item.total_discount || 0),
            LineRemarks: item.name,
        }));

        // Calculate shipping charge
        const shippingCharge = order.shipping_lines?.reduce(
            (sum, line) => sum + parseFloat(line.price || 0), 0
        ) || 0;

        // Other charges (shipping)
        const otherCharges = shippingCharge > 0 ? {
            Charge: [{
                ChargeDescription: 'Shipping',
                ChargeValue: shippingCharge,
                ChargeReference: order.shipping_lines?.[0]?.title || 'Standard Shipping',
            }]
        } : {};

        // Payment information
        const payments = {
            Payment: [{
                PaymentMode: this.mapPaymentGateway(order.gateway),
                PaymentValue: parseFloat(order.total_price),
                ModeType: order.payment_gateway_names?.[0] || '',
                PaymentReference: order.checkout_token || '',
            }]
        };

        // Extract state GST code (for Indian orders)
        const stateGSTCode = this.getStateGSTCode(shippingAddress.province);

        return {
            Order: {
                Customer: {
                    TitleName: '',
                    FirstName: customer.first_name || shippingAddress.first_name || 'Guest',
                    MiddleName: '',
                    LastName: customer.last_name || shippingAddress.last_name || '',
                    Gender: '',
                    MobileNumber: shippingAddress.phone || customer.phone || '',
                    EmailID: customer.email || order.email || '',
                    CustomerAddressLine1: billingAddress.address1 || '',
                    CustomerAddressLine2: billingAddress.address2 || '',
                    CustomerAddressLine3: '',
                    CustomerCityName: billingAddress.city || '',
                    CustomerStateName: billingAddress.province || '',
                    CustomerStateGSTCode: stateGSTCode,
                    Pincode: billingAddress.zip || '',
                },
                Header: {
                    OrderDate: formattedDate,
                    OrderNumber: order.name || `ORD${order.id}`,
                    OrderLocation: config.eshopaid.storeLocation,
                    CustomerCode: '',
                    DeliveryAddressLine1: shippingAddress.address1 || '',
                    DeliveryAddressLine2: shippingAddress.address2 || '',
                    DeliveryAddressLine3: '',
                    DeliveryCityName: shippingAddress.city || '',
                    DeliveryStateName: shippingAddress.province || '',
                    DeliveryStateGSTCode: stateGSTCode,
                    DeliveryPincode: shippingAddress.zip || '',
                    TotalOrderValue: parseFloat(order.total_price),
                    ExpectedDeliveryDate: '',
                    OrderRemarks: order.note || '',
                    SourceChannel: config.eshopaid.sourceChannel,
                },
                Items: { Item: items },
                OtherCharges: otherCharges,
                Payments: payments,
            }
        };
    }

    /**
     * Map Shopify payment gateway to eShopaid payment mode
     * @param {string} gateway - Shopify gateway name
     * @returns {string} eShopaid payment mode
     */
    mapPaymentGateway(gateway) {
        const gatewayMap = {
            'shopify_payments': 'CreditCard',
            'paypal': 'PayPal',
            'razorpay': 'OnlinePayment',
            'paytm': 'OnlinePayment',
            'cod': 'Cash',
            'cash_on_delivery': 'Cash',
            'manual': 'Cash',
        };

        return gatewayMap[gateway?.toLowerCase()] || 'OnlinePayment';
    }

    /**
     * Get GST state code for Indian states
     * @param {string} stateName - State name
     * @returns {string} GST code
     */
    getStateGSTCode(stateName) {
        const gstCodes = {
            'jammu and kashmir': '01', 'himachal pradesh': '02', 'punjab': '03',
            'chandigarh': '04', 'uttarakhand': '05', 'haryana': '06',
            'delhi': '07', 'rajasthan': '08', 'uttar pradesh': '09',
            'bihar': '10', 'sikkim': '11', 'arunachal pradesh': '12',
            'nagaland': '13', 'manipur': '14', 'mizoram': '15',
            'tripura': '16', 'meghalaya': '17', 'assam': '18',
            'west bengal': '19', 'jharkhand': '20', 'odisha': '21',
            'chattisgarh': '22', 'madhya pradesh': '23', 'gujarat': '24',
            'dadra and nagar haveli': '26', 'maharashtra': '27', 'karnataka': '29',
            'goa': '30', 'lakshadweep': '31', 'kerala': '32',
            'tamil nadu': '33', 'puducherry': '34', 'andaman and nicobar': '35',
            'telangana': '36', 'andhra pradesh': '37', 'ladakh': '38',
        };

        return gstCodes[stateName?.toLowerCase()] || '';
    }

    /**
     * Set order status in eShopaid
     * @param {string} orderNumber - Vendor order number
     * @param {string} orderDate - Order date (YYYY-MM-DD format)
     * @param {string} status - New status (DELIVERED, CANCELLED, etc.)
     * @param {string} location - Order location
     * @returns {Promise<object>} Response
     */
    async setOrderStatus(orderNumber, orderDate, status, location = config.eshopaid.storeLocation) {
        const statusData = {
            OrderStatusUpdate: {
                VendorOrderDate: orderDate,
                VendorOrderNumber: orderNumber,
                OrderLocation: location,
                OrderStatus: status,
            }
        };

        console.log(`[OrderService] Updating order ${orderNumber} status to: ${status}`);
        const response = await this.makeRequest(config.methods.SET_ORDER_STATUS, statusData);

        return this.parseStatusResponse(response);
    }

    /**
     * Create a return order in eShopaid
     * @param {object} returnData - Return order data
     * @returns {Promise<object>} Response
     */
    async createReturnOrder(returnData) {
        console.log(`[OrderService] Creating return order for: ${returnData.refOrderNumber}`);

        const returnOrder = {
            ReturnOrder: {
                Customer: returnData.customer,
                Header: {
                    ReturnOrderDate: returnData.returnDate,
                    ReturnOrderNumber: returnData.returnOrderNumber,
                    RefOrderDate: returnData.refOrderDate,
                    RefOrderNumber: returnData.refOrderNumber,
                    RefOrderLocation: returnData.location || config.eshopaid.storeLocation,
                    TotalReturnOrderValue: returnData.totalValue,
                    ReturnOrderRemarks: returnData.remarks || '',
                    SourceChannel: config.eshopaid.sourceChannel,
                },
                Items: { Item: returnData.items },
                Payments: { Payment: returnData.payments },
            }
        };

        const response = await this.makeRequest(config.methods.CREATE_RETURN_ORDER, returnOrder);
        return this.parseOrderResponse(response);
    }

    /**
     * Parse order creation/return response
     * @param {object} response - API response
     * @returns {object} Parsed result
     */
    parseOrderResponse(response) {
        if (response.Response) {
            return {
                success: response.Response.Result === 'SUCCESS',
                message: response.Response.StatusMessage,
                data: response.Response.StatusReference || response.Response.Data,
                error: response.Response.FailureReason,
            };
        }
        return { success: false, error: 'Invalid response format' };
    }

    /**
     * Parse status update response
     * @param {object} response - API response
     * @returns {object} Parsed result
     */
    parseStatusResponse(response) {
        if (response.Response) {
            return {
                success: response.Response.Result === 'SUCCESS',
                data: response.Response.Data?.OrderStatusUpdate,
                error: response.Response.FailureReason,
            };
        }
        return { success: false, error: 'Invalid response format' };
    }
}

module.exports = new OrderService();
