/**
 * Test script for Creating Sales Order and Return in eShopaid
 */

const orderService = require('./order-service');
const config = require('./config');

async function runTest() {
    console.log('--- Starting eShopaid Order and Return Test ---');

    // 1. Mock Shopify Order
    const timestamp = Date.now();
    const shortId = timestamp.toString().slice(-6);
    const mockOrder = {
        id: timestamp,
        order_number: `T-${shortId}`,
        name: `T-${shortId}`,
        created_at: new Date().toISOString(),
        total_price: "5500.00",
        gateway: "razorpay",
        payment_gateway_names: ["Razorpay"],
        checkout_token: `token-${timestamp}`,
        email: "test_customer@example.com",
        customer: {
            first_name: "Test",
            last_name: "Customer",
            email: "test_customer@example.com",
            phone: "9876543210"
        },
        shipping_address: {
            first_name: "Test",
            last_name: "Customer",
            address1: "123 Test Lane",
            city: "Mumbai",
            province: "Maharashtra",
            zip: "400001",
            phone: "9876543210"
        },
        billing_address: {
            first_name: "Test",
            last_name: "Customer",
            address1: "123 Test Lane",
            city: "Mumbai",
            province: "Maharashtra",
            zip: "400001"
        },
        line_items: [
            {
                variant_id: 123456789,
                sku: "SD260100001",
                quantity: 1,
                price: "5500.00",
                name: "FEAR OF GOD ESSENTIALS NBA TEEBLACK SMALL",
                total_discount: "0.00"
            }
        ],
        shipping_lines: [
            {
                title: "Standard Shipping",
                price: "0.00"
            }
        ]
    };

    try {
        // 2. Create Sales Order
        console.log('\nStep 1: Creating Sales Order...');
        const orderResponse = await orderService.createSalesOrder(mockOrder);
        console.log('Order Creation Response:', JSON.stringify(orderResponse, null, 2));

        if (!orderResponse.success) {
            console.error('Order creation failed. Stopping test.');
            return;
        }

        console.log('Order created successfully!');

        // 3. Attempt Return
        // The returnDate should be YYYYMMDD as per transformShopifyOrder's logic for OrderDate
        const formattedDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');

        console.log('\nStep 2: Attempting Return for the created order...');
        const returnData = {
            returnOrderNumber: `RET-${mockOrder.order_number}`,
            returnDate: formattedDate,
            refOrderNumber: mockOrder.name || mockOrder.order_number,
            refOrderDate: formattedDate,
            totalValue: parseFloat(mockOrder.total_price),
            remarks: "Test Return",
            customer: {
                FirstName: mockOrder.customer.first_name,
                LastName: mockOrder.customer.last_name,
                MobileNumber: mockOrder.customer.phone,
                EmailID: mockOrder.customer.email,
                CustomerAddressLine1: mockOrder.billing_address.address1,
                CustomerCityName: mockOrder.billing_address.city,
                CustomerStateName: mockOrder.billing_address.province,
                Pincode: mockOrder.billing_address.zip
            },
            items: mockOrder.line_items.map((item, index) => ({
                LineNumber: index + 1,
                RefLineNumber: index + 1, // Mandatory: original sales order line number
                ItemCode: item.sku || item.variant_id.toString(),
                Quantity: item.quantity,
                Rate: parseFloat(item.price),
                DiscountAmount: 0,
                LineRemarks: "Return: " + item.name
            })),
            payments: [
                {
                    PaymentMode: "OnlinePayment",
                    PaymentValue: parseFloat(mockOrder.total_price),
                    ModeType: "Razorpay",
                    PaymentReference: mockOrder.checkout_token
                }
            ]
        };

        const returnResponse = await orderService.createReturnOrder(returnData);
        console.log('Return Attempt Response:', JSON.stringify(returnResponse, null, 2));

        if (returnResponse.success) {
            console.log('Return order created successfully!');
        } else {
            console.log('Return order creation failed. (This might be expected depending on business rules).');
        }

    } catch (error) {
        console.error('An error occurred during the test:', error);
    }
}

runTest();
