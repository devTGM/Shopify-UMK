/**
 * Test Connection Script
 * Run this to test your eShopaid API connection
 */

require('dotenv').config();
const eshopaid = require('./index');

async function testConnection() {
    console.log('='.repeat(50));
    console.log('eShopaid API Connection Test');
    console.log('='.repeat(50));
    console.log('');

    // Check configuration
    console.log('Configuration:');
    console.log(`  Server URL: ${eshopaid.config.eshopaid.serverUrl}`);
    console.log(`  Username: ${eshopaid.config.eshopaid.username}`);
    console.log(`  Store Location: ${eshopaid.config.eshopaid.storeLocation}`);
    console.log('');

    // Test token generation
    console.log('Testing token generation...');
    try {
        const result = await eshopaid.testConnection();

        if (result.success) {
            console.log('✅ Token generated successfully!');
            console.log('');

            // Test inventory fetch
            console.log('Testing inventory fetch...');
            try {
                const inventory = await eshopaid.inventory.getInventoryByLocation();

                if (inventory.success) {
                    console.log(`✅ Inventory fetched successfully!`);
                    console.log(`   Total items: ${inventory.totalItems}`);
                    console.log(`   Locations: ${inventory.inventoryByLocation.length}`);

                    // Show sample items
                    if (inventory.inventoryByLocation[0]?.items.length > 0) {
                        console.log('');
                        console.log('Sample inventory items:');
                        inventory.inventoryByLocation[0].items.slice(0, 3).forEach(item => {
                            console.log(`   - ${item.itemName}: ${item.stock} in stock (₹${item.salesPrice})`);
                        });
                    }
                } else {
                    console.log(`❌ Inventory fetch failed: ${inventory.error}`);
                }
            } catch (invError) {
                console.log(`❌ Inventory fetch error: ${invError.message}`);
            }
        } else {
            console.log(`❌ Connection failed: ${result.message}`);
        }
    } catch (error) {
        console.log(`❌ Connection error: ${error.message}`);
        console.log('');
        console.log('Please check:');
        console.log('  1. ESHOPAID_SERVER_URL is correct');
        console.log('  2. ESHOPAID_USERNAME and ESHOPAID_PASSWORD are valid');
        console.log('  3. The eShopaid server is accessible from this machine');
    }

    console.log('');
    console.log('='.repeat(50));
}

testConnection().catch(console.error);
