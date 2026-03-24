/**
 * Full test for PushOrderReturn
 */

const orderService = require('./order-service');
const config = require('./config');

async function runTest() {
    console.log('--- Testing PushOrderReturn with full payload ---');

    const timestamp = Date.now();
    const shortId = timestamp.toString().slice(-6);

    // Using the same structure as CreateReturnOrder but with the new method name
    const returnData = {
        ReturnOrder: {
            Customer: {
                FirstName: "Test",
                LastName: "Customer",
                MobileNumber: "9876543210",
                EmailID: "test@example.com",
                CustomerAddressLine1: "123 Test Lane",
                CustomerCityName: "Mumbai",
                CustomerStateName: "Maharashtra",
                Pincode: "400001"
            },
            Header: {
                ReturnOrderDate: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
                ReturnOrderNumber: `RET-${shortId}`,
                RefOrderDate: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
                RefOrderNumber: `T-189841`, // Using the successful order from before
                RefOrderLocation: config.eshopaid.storeLocation,
                TotalReturnOrderValue: 5500,
                ReturnOrderRemarks: "Test Return Push",
                SourceChannel: config.eshopaid.sourceChannel
            },
            Items: {
                Item: [{
                    LineNumber: 1,
                    ItemCode: "SD260100001",
                    Quantity: 1,
                    Rate: 5500,
                    DiscountAmount: 0,
                    LineRemarks: "Return: FEAR OF GOD ESSENTIALS NBA TEEBLACK SMALL"
                }]
            },
            Payments: {
                Payment: [{
                    PaymentMode: "OnlinePayment",
                    PaymentValue: 5500,
                    ModeType: "Razorpay",
                    PaymentReference: `ref-${shortId}`
                }]
            }
        }
    };

    try {
        console.log('Testing PushOrderReturn...');
        const response = await orderService.makeRequest('PushOrderReturn', returnData);
        console.log('Response:', JSON.stringify(response, null, 2));
    } catch (error) {
        console.log('PushOrderReturn failed:', error.response ? error.response.statusText : error.message);
        if (error.response && error.response.data) {
            console.log('Error Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

runTest();
