/**
 * graphParser.js
 * Converts a React Flow node/edge graph into a topologically sorted
 * execution order using Kahn's algorithm (BFS).
 */

/**
 * @param {Array} nodes  - React Flow nodes
 * @param {Array} edges  - React Flow edges
 * @returns {string[]}   - Node IDs in execution order
 * @throws {Error}       - If a cycle is detected
 */
export function topologicalSort(nodes, edges) {
  const nodeIds = new Set(nodes.map((n) => n.id));

  // Build adjacency list: source → [targets]
  const adj = {};       // { nodeId: Set<nodeId> }
  const inDegree = {};  // { nodeId: number }

  for (const id of nodeIds) {
    adj[id] = new Set();
    inDegree[id] = 0;
  }

  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      adj[edge.source].add(edge.target);
      inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
    }
  }

  // BFS queue — start with all nodes that have no incoming edges
  const queue = [];
  for (const id of nodeIds) {
    if (inDegree[id] === 0) queue.push(id);
  }

  const sorted = [];
  while (queue.length > 0) {
    const current = queue.shift();
    sorted.push(current);
    for (const neighbor of adj[current]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  if (sorted.length !== nodeIds.size) {
    throw new Error('Cycle detected in the graph — cannot execute.');
  }

  return sorted;
}

/**
 * Given the sorted order and edges, build an input map for each node:
 * { [nodeId]: { prompt?: string, image?: string, video?: string, text?: string } }
 * based on the outputs of upstream nodes.
 */
export function buildInputMap(sortedIds, edges, nodeOutputs, nodes = []) {
  const inputMap = {};

  for (const targetId of sortedIds) {
    inputMap[targetId] = {};
    // Find all edges pointing to this node
    const incoming = edges.filter((e) => e.target === targetId);
    for (const edge of incoming) {
      let sourceOutput = nodeOutputs[edge.source];
      
      // If the node hasn't been explicitly 'run', try to pull its static data directly
      if (!sourceOutput && nodes.length > 0) {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        if (sourceNode?.type === 'promptNode') sourceOutput = { prompt: sourceNode.data?.text || '' };
        if (sourceNode?.type === 'imageInputNode') sourceOutput = { image: sourceNode.data?.image || null };
      }

      if (!sourceOutput) continue;
      // Merge source outputs into this node's inputs
      Object.assign(inputMap[targetId], sourceOutput);
    }
  }

  return inputMap;
}
