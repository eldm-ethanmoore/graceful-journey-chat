/**
 * MetaMask Authentication Lambda Function
 * 
 * This Lambda function verifies Ethereum signatures for authentication.
 * It's completely stateless and doesn't require any database.
 * 
 * Deploy this function with API Gateway HTTP API.
 */

// Import ethers.js v6 for Ethereum utilities
const { ethers } = require('ethers');

// JWT secret for token signing
// In production, use AWS Secrets Manager or environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Token expiration time (24 hours)
const TOKEN_EXPIRATION_MS = 24 * 60 * 60 * 1000;

/**
 * Lambda handler function
 */
exports.handler = async (event) => {
  // Set up CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  };
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight response' })
    };
  }
  
  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { address, signature, message } = body;
    
    // Validate required parameters
    if (!address || !signature || !message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required parameters: address, signature, message'
        })
      };
    }
    
    // Verify the signature using ethers.js v6
    // Note: In v6, verifyMessage is directly on ethers, not ethers.utils
    const recoveredAddress = ethers.verifyMessage(message, signature);
    const verified = recoveredAddress.toLowerCase() === address.toLowerCase();
    
    if (!verified) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Invalid signature',
          verified: false
        })
      };
    }
    
    // Create JWT token
    const token = createToken(address);
    
    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        verified: true,
        address,
        token,
        expiresAt: Date.now() + TOKEN_EXPIRATION_MS
      })
    };
  } catch (error) {
    console.error('Error processing request:', error);
    
    // Return error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

/**
 * Create a JWT token
 * @param {string} address Ethereum address
 * @returns {string} JWT token
 */
function createToken(address) {
  // In a real implementation, use a proper JWT library
  // This is a simplified example
  
  // Create JWT header
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  // Create JWT payload
  const payload = {
    sub: address,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor((Date.now() + TOKEN_EXPIRATION_MS) / 1000)
  };
  
  // Encode header and payload
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64').replace(/=/g, '');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/=/g, '');
  
  // Create signature
  const crypto = require('crypto');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '');
  
  // Return JWT token
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify a JWT token
 * @param {string} token JWT token
 * @returns {object|null} Decoded payload or null if invalid
 */
function verifyToken(token) {
  try {
    // Split token into parts
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    
    // Verify signature
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    // Decode payload
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString());
    
    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return payload;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}