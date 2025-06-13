/**
 * WebRTC Signaling Server Lambda Function
 * 
 * This Lambda function handles WebSocket connections for WebRTC signaling.
 * It's designed to be stateless, with all state maintained by clients.
 * 
 * Deploy this function with API Gateway WebSocket API.
 */

// In-memory cache of active connections per room
// This is only used within a single Lambda invocation
const roomConnections = {};

/**
 * Handle WebSocket connect event
 */
exports.connectHandler = async (event) => {
  console.log('Client connected:', event.requestContext.connectionId);
  
  return { statusCode: 200, body: 'Connected' };
};

/**
 * Handle WebSocket disconnect event
 */
exports.disconnectHandler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  console.log('Client disconnected:', connectionId);
  
  // Clean up any room memberships
  for (const roomId in roomConnections) {
    roomConnections[roomId] = roomConnections[roomId].filter(id => id !== connectionId);
    
    // Clean up empty rooms
    if (roomConnections[roomId].length === 0) {
      delete roomConnections[roomId];
    }
  }
  
  return { statusCode: 200, body: 'Disconnected' };
};

/**
 * Handle WebSocket messages
 */
exports.messageHandler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  let body;
  
  try {
    body = JSON.parse(event.body);
  } catch (error) {
    console.error('Error parsing message body:', error);
    return { statusCode: 400, body: 'Invalid message format' };
  }
  
  // Handle different message types
  switch (body.type) {
    case 'join-room':
      return handleJoinRoom(event, connectionId, body.roomId);
    case 'signal':
      return handleSignal(event, connectionId, body.targetId, body.signal, body.roomId);
    case 'broadcast':
      return handleBroadcast(event, connectionId, body.roomId, body.data);
    default:
      console.error('Unknown message type:', body.type);
      return { statusCode: 400, body: 'Unknown message type' };
  }
};

/**
 * Handle room joining
 */
async function handleJoinRoom(event, connectionId, roomId) {
  console.log(`Connection ${connectionId} joining room ${roomId}`);
  
  // Initialize room if it doesn't exist
  if (!roomConnections[roomId]) {
    roomConnections[roomId] = [];
  }
  
  // Add to room if not already there
  if (!roomConnections[roomId].includes(connectionId)) {
    roomConnections[roomId].push(connectionId);
  }
  
  // Get API Gateway management API
  const apigwManagementApi = getApiGatewayManagementApi(event);
  
  // Notify the joining connection about other peers in the room
  const otherPeers = roomConnections[roomId].filter(id => id !== connectionId);
  
  await sendToConnection(apigwManagementApi, connectionId, {
    type: 'room-joined',
    peers: otherPeers,
    roomId
  });
  
  // Notify other peers about the new connection
  for (const peerId of otherPeers) {
    await sendToConnection(apigwManagementApi, peerId, {
      type: 'peer-joined',
      peerId: connectionId,
      roomId
    });
  }
  
  return { statusCode: 200, body: 'Joined room' };
}

/**
 * Handle signaling messages
 */
async function handleSignal(event, connectionId, targetId, signal, roomId) {
  console.log(`Connection ${connectionId} sending signal to ${targetId} in room ${roomId}`);
  
  // Get API Gateway management API
  const apigwManagementApi = getApiGatewayManagementApi(event);
  
  // Forward signal to the target peer
  await sendToConnection(apigwManagementApi, targetId, {
    type: 'signal',
    peerId: connectionId,
    signal,
    roomId
  });
  
  return { statusCode: 200, body: 'Signal sent' };
}

/**
 * Handle broadcast messages
 */
async function handleBroadcast(event, connectionId, roomId, data) {
  console.log(`Connection ${connectionId} broadcasting to room ${roomId}`);
  
  // Check if room exists
  if (!roomConnections[roomId]) {
    return { statusCode: 404, body: 'Room not found' };
  }
  
  // Get API Gateway management API
  const apigwManagementApi = getApiGatewayManagementApi(event);
  
  // Send to all peers except the sender
  const peers = roomConnections[roomId].filter(id => id !== connectionId);
  
  for (const peerId of peers) {
    await sendToConnection(apigwManagementApi, peerId, {
      type: 'broadcast',
      peerId: connectionId,
      data,
      roomId
    });
  }
  
  return { statusCode: 200, body: 'Broadcast sent' };
}

/**
 * Get API Gateway management API
 */
function getApiGatewayManagementApi(event) {
  const domain = event.requestContext.domainName;
  const stage = event.requestContext.stage;
  const endpoint = `https://${domain}/${stage}`;
  
  return new (require('aws-sdk').ApiGatewayManagementApi)({
    apiVersion: '2018-11-29',
    endpoint
  });
}

/**
 * Send message to a WebSocket connection
 */
async function sendToConnection(apigwManagementApi, connectionId, data) {
  try {
    await apigwManagementApi.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify(data)
    }).promise();
  } catch (error) {
    console.error(`Error sending message to connection ${connectionId}:`, error);
    
    // If connection is no longer available, clean up our in-memory references
    if (error.statusCode === 410) {
      console.log(`Connection ${connectionId} is gone, cleaning up`);
      
      // Remove from all rooms
      for (const roomId in roomConnections) {
        roomConnections[roomId] = roomConnections[roomId].filter(id => id !== connectionId);
        
        // Clean up empty rooms
        if (roomConnections[roomId].length === 0) {
          delete roomConnections[roomId];
        }
      }
    }
  }
}