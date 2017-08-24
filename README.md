# Local Distributed System in NodeJS (w/WebSockets)
Experiment in NodeJS with Websockets serving as the communication layer between nodes in a distributed system. 

Each node has a port to listen for events from other nodes on and a port to connect to other nodes over. A node can connect to an any number of other nodes via its server port, and any node can listen to any number of nodes over its client port.

The default number of nodes in the distributed system is 5, but a larger number can be used like this:
```
new DistNodes(20);
```

The nodes are created in a way such that the first node is a `terminal node`, meaning that it can listen to other nodes, but cannot transmit data. Every subsequent node will be connected to all previous nodes.

### Distributed System Topology Example
| NodeNum | Client Port | Server Port | Subscribers    |
| ------- | ----------- | ----------- | -------------- |
| 0       | 8000        | ----        | ----           |
| 1       | 8001        | 8000        | Node 0         |
| 2       | 8002        | 8001        | Node 0, Node 1 |

## Getting Started
- [Install NVM (Node Version Manager)](https://github.com/creationix/nvm)

```
nvm install 8.4.0
nvm use 8.4.0
npm i
node distributed_nodes
```
You will then see logging for the messages that are sent between nodes upon connection, and then propagated through the system.

## Author
* **Mike Situ** - [Github Repos](https://github.com/shola)

## License
This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details