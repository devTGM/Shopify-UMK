/**
 * Token Manager for eShopaid API
 * Handles token generation and automatic refresh
 */

const axios = require('axios');
const config = require('./config');

class TokenManager {
    constructor() {
        this.token = null;
        this.tokenExpiry = null;
    }

    /**
     * Check if current token is valid
     * @returns {boolean}
     */
    isTokenValid() {
        if (!this.token || !this.tokenExpiry) {
            return false;
        }

        // Add buffer time before expiry
        const bufferMs = config.eshopaid.tokenRefreshBuffer * 60 * 1000;
        return Date.now() < (this.tokenExpiry - bufferMs);
    }

    /**
     * Generate a new token from eShopaid API
     * @returns {Promise<string>} Access token
     */
    async generateToken() {
        try {
            const url = `${config.eshopaid.serverUrl}${config.eshopaid.tokenEndpoint}`;

            // Use POST with empty body as required by eShopaid API
            const response = await axios.post(url, '', {
                headers: {
                    'SERVICE_METHODNAME': config.methods.GET_TOKEN,
                    'Username': config.eshopaid.username,
                    'Password': config.eshopaid.password,
                    'Content-Type': 'application/json',
                },
            });

            const data = response.data;

            // Handle both XML and JSON responses
            let result, accessToken;

            if (typeof data === 'string') {
                // XML response - parse it
                const xmlMatch = data.match(/<Access_Token>(.*?)<\/Access_Token>/);
                if (xmlMatch) {
                    accessToken = xmlMatch[1];
                }
            } else if (data.Response) {
                // JSON response
                result = data.Response.Result;
                accessToken = data.Response.Access_Token;
            }

            if (accessToken) {
                this.token = accessToken;
                // Token lifetime is 30 minutes
                this.tokenExpiry = Date.now() + (config.eshopaid.tokenLifetimeMinutes * 60 * 1000);
                console.log('[TokenManager] Token generated successfully');
                return this.token;
            } else {
                throw new Error('Failed to extract token from response');
            }
        } catch (error) {
            console.error('[TokenManager] Token generation failed:', error.message);
            throw error;
        }
    }

    /**
     * Get a valid token, generating a new one if needed
     * @returns {Promise<string>} Access token
     */
    async getToken() {
        if (this.isTokenValid()) {
            return this.token;
        }
        return await this.generateToken();
    }

    /**
     * Force refresh the token
     * @returns {Promise<string>} New access token
     */
    async refreshToken() {
        return await this.generateToken();
    }

    /**
     * Clear the current token
     */
    clearToken() {
        this.token = null;
        this.tokenExpiry = null;
        console.log('[TokenManager] Token cleared');
    }
}

// Singleton instance
const tokenManager = new TokenManager();

module.exports = tokenManager;
