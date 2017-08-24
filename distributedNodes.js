const WS = require("ws");
const http = require("http");
let NODE_ID = 0;
let SEQUENCE_ID = 0;
let PORT_NUM = 8000;

class DistNode {
  constructor(clientPort, serverPort = null) {
    this.nodeID = DistNode.createNodeID();
    this.clientPort = clientPort;
    this.serverPort = serverPort;
    this.client = undefined;
    this.subscribers = [];
    this.server = undefined;
  }
  static createNodeID() {
    return NODE_ID++;
  }
  static createSequenceID() {
    return SEQUENCE_ID++;
  }
  broadcast(dataStr, listenTo) {
    if (this.server === undefined) {
      // can't broadcast if this node doesn't have a server
      return;
    } else if (this.server.clients.size <= 1) {
      // can't broadcast if the only client is this node's own client
      return;
    }

    const data = JSON.parse(dataStr);
    const port = this.port;
    const nodeID = this.nodeID;
    let foundBroadcast = false;

    this.server.clients.forEach(s => {
      if (foundBroadcast) {
        // do not execute the rest of this foreach block for the clients
      } else if (s.readyState !== WS.OPEN) {
        console.info(`Node ${nodeID}: websocket not open. Can't broadcast.`);
      } else if (listenTo === s) {
        console.info(`Node ${nodeID}: don't talk to yourself`);
      } else if (data.visitedNodes.includes(nodeID)) {
        foundBroadcast = true;
        console.info(`Node ${nodeID}: already visited. Don't broadcast.`);
      } else {
        const newDataStr = JSON.stringify({
          visitedNodes: [nodeID, ...data.visitedNodes],
          sequenceID: DistNode.createSequenceID(),
          oldData: data
        });
        foundBroadcast = true; // once you a valid websocket to broadcast on, do it.
        console.log(`Node ${nodeID}: brodcasting ${newDataStr} to ${port}`);

        s.send(newDataStr);
      }
    });
  }
  setupListeners(type, listenToPort, listenTo) {
    const nodeID = this.nodeID;
    const boundBroadcast = this.broadcast.bind(this);

    listenTo.on("open", () => {
      console.log(`Node ${nodeID}: opened a "${type}" on port ${listenToPort}`);
    });

    listenTo.on("error", err => {
      const msg = `Node ${nodeID}: error for "${type}" on port ${listenToPort} => ${err}`;
      console.error(msg);
    });

    listenTo.on("message", dataStr => {
      const msg = `Node ${nodeID}: "${type}" received data on port ${listenToPort} => ${dataStr}`;
      console.log(msg);
      boundBroadcast(dataStr, listenTo);
    });
  }
  createListener(newSubscriberPort) {
    // create a client if the server exists and client is undefined
    if (!newSubscriberPort) {
      const clientUrl = `ws://localhost:${this.clientPort}`;
      const client = new WS(clientUrl);
      this.client = client;
      this.setupListeners("client", this.clientPort, client);
    } else {
      const clientUrl = `ws://localhost:${newSubscriberPort}`;
      const subscriber = new WS(clientUrl);
      this.subscribers.push(subscriber); // save a reference so subscribers stay alive
      this.setupListeners("subscriber", newSubscriberPort, subscriber);
    }
  }

  createServer() {
    // return the server port if one is created
    const port = this.serverPort;
    const nodeID = this.nodeID;

    if (port) {
      const wsServer = new WS.Server({ port });
      this.server = wsServer;
      console.log(`Node ${nodeID}: server has started`);

      wsServer.on("connection", client => {
        const payload = JSON.stringify({
          port,
          visitedNodes: [nodeID],
          sequenceID: DistNode.createSequenceID()
        });
        console.log(`Node ${nodeID}: connection made and sent data to ${port}`);
        client.send(payload);
      });
      wsServer.on("error", err => {
        console.error(`there was an error on server ${nodeID}`, err);
      });

      return port;
    }
  }
}

class DistNodes {
  constructor(numNodes = 5) {
    this.nodes = [];
    this.addNodes(numNodes);
  }
  addNodes(numNodes) {
    for (let i = 0; i < numNodes; i++) {
      this.addNode();
    }
  }
  addNode() {
    let node;
    if (this.nodes.length === 0) {
      // create the first node. it is a terminal node and will not have a server
      node = new DistNode(PORT_NUM);
    } else {
      node = new DistNode(PORT_NUM + 1, PORT_NUM);
      PORT_NUM++;
    }
    this.connectToExistingNodes(node);
    this.nodes.push(node);
  }
  connectNodes(newNode, oldNode) {
    // this is where we actually create servers and clients for nodes
    if (!newNode.server) {
      newNode.createServer();
    }
    if (!oldNode.client) {
      oldNode.createListener();
    }
    newNode.createListener(oldNode.clientPort); // create client for this node to connect to
  }
  connectToExistingNodes(newNode) {
    // only connect nodes if more than one node exists
    // treat the first node as a terminal node
    if (this.nodes.length > 0) {
      this.nodes.forEach(oldNode => {
        this.connectNodes(newNode, oldNode);
      });
    }
  }
}

const myDist = new DistNodes();
