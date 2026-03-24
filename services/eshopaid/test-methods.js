/**
 * Experimental script to find enabled return methods
 */

const orderService = require('./order-service');
const config = require('./config');

async function testMethods() {
    const methods = ['CreateReturnOrder', 'PushReturnOrder', 'PushOrderReturn', 'AddSalesReturn', 'CreateSalesReturn', 'AddReturnOrder', 'SalesReturn'];

    console.log('--- Testing Alternative Return Methods ---');

    for (const method of methods) {
        console.log(`\nTesting method: ${method}...`);
        try {
            const response = await orderService.makeRequest(method, {
                // Sending minimum data to see if we get a method error or a data error
                Ping: "Test"
            });
            console.log(`Response for ${method}:`, JSON.stringify(response, null, 2));
        } catch (error) {
            console.log(`Method ${method} failed:`, error.response ? error.response.statusText : error.message);
        }
    }
}

testMethods();
