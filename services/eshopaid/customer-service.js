/**
 * Customer Service for eShopaid API
 * Handles customer creation and updates
 */

const axios = require('axios');
const config = require('./config');
const tokenManager = require('./token-manager');

class CustomerService {
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
            console.error(`[CustomerService] API request failed:`, error.message);
            throw error;
        }
    }

    /**
     * Add a new customer to eShopaid
     * @param {object} customerData - Customer information
     * @returns {Promise<object>} Response with customer code
     */
    async addCustomer(customerData) {
        const customer = this.formatCustomerData(customerData);

        console.log(`[CustomerService] Adding customer: ${customerData.email || customerData.phone}`);
        const response = await this.makeRequest(config.methods.ADD_CUSTOMER, { Customer: customer });

        return this.parseResponse(response);
    }

    /**
     * Modify an existing customer in eShopaid
     * @param {string} customerCode - eShopaid customer code
     * @param {object} customerData - Updated customer information
     * @returns {Promise<object>} Response
     */
    async modifyCustomer(customerCode, customerData) {
        const customer = this.formatCustomerData(customerData);
        customer.CustomerCode = customerCode;

        console.log(`[CustomerService] Modifying customer: ${customerCode}`);
        const response = await this.makeRequest(config.methods.MODIFY_CUSTOMER, { Customer: customer });

        return this.parseResponse(response);
    }

    /**
     * Add or update customer from Shopify customer object
     * @param {object} shopifyCustomer - Shopify customer object
     * @param {string} existingCode - Existing eShopaid customer code (optional)
     * @returns {Promise<object>} Response
     */
    async syncFromShopify(shopifyCustomer, existingCode = null) {
        const customerData = this.transformShopifyCustomer(shopifyCustomer);

        if (existingCode) {
            return this.modifyCustomer(existingCode, customerData);
        }
        return this.addCustomer(customerData);
    }

    /**
     * Transform Shopify customer to eShopaid format
     * @param {object} customer - Shopify customer
     * @returns {object} eShopaid customer format
     */
    transformShopifyCustomer(customer) {
        const address = customer.default_address || customer.addresses?.[0] || {};

        // Parse DOB if available
        let dobDay = '', dobMonth = '', dobYear = '';
        if (customer.birthday || customer.metafields?.dob) {
            const dob = new Date(customer.birthday || customer.metafields.dob);
            if (!isNaN(dob.getTime())) {
                dobDay = dob.getDate();
                dobMonth = dob.getMonth() + 1;
                dobYear = dob.getFullYear();
            }
        }

        return {
            firstName: customer.first_name || '',
            lastName: customer.last_name || '',
            email: customer.email || '',
            phone: customer.phone || address.phone || '',
            address1: address.address1 || '',
            address2: address.address2 || '',
            city: address.city || '',
            state: address.province || '',
            pincode: address.zip || '',
            dobDay,
            dobMonth,
            dobYear,
        };
    }

    /**
     * Format customer data to eShopaid API format
     * @param {object} data - Customer data
     * @returns {object} Formatted customer object
     */
    formatCustomerData(data) {
        return {
            TitleName: data.title || '',
            FirstName: data.firstName || data.first_name || '',
            MiddleName: data.middleName || '',
            LastName: data.lastName || data.last_name || '',
            Gender: data.gender || '',
            MobileNumber: data.phone || data.mobileNumber || '',
            EmailID: data.email || data.emailId || '',
            CustomerAddressLine1: data.address1 || data.customerAddressLine1 || '',
            CustomerAddressLine2: data.address2 || data.customerAddressLine2 || '',
            CustomerAddressLine3: data.address3 || data.customerAddressLine3 || '',
            CustomerCityName: data.city || data.customerCityName || '',
            CustomerStateName: data.state || data.customerStateName || '',
            Pincode: data.pincode || data.zip || '',
            DeliveryAddressLine1: data.deliveryAddress1 || '',
            DeliveryAddressLine2: data.deliveryAddress2 || '',
            DeliveryAddressLine3: data.deliveryAddress3 || '',
            DeliveryCityName: data.deliveryCity || '',
            DeliveryStateName: data.deliveryState || '',
            DeliveryPincode: data.deliveryPincode || '',
            DOBDay: data.dobDay || '',
            DOBMonth: data.dobMonth || '',
            DOBYear: data.dobYear || '',
        };
    }

    /**
     * Parse API response
     * @param {object} response - API response
     * @returns {object} Parsed result
     */
    parseResponse(response) {
        if (response.Response) {
            return {
                success: response.Response.Result === 'SUCCESS',
                customerCode: response.Response.Data?.CustomerCode,
                error: response.Response.FailureReason,
            };
        }
        return { success: false, error: 'Invalid response format' };
    }
}

module.exports = new CustomerService();
