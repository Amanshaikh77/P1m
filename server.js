const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.static('public'));

app.post('/api/run-workflow', async (req, res) => {
  const { graph } = req.body;
  if (!graph) return res.status(400).json({ error: 'No graph data' });

  const executionTrace = [];
  const nodeOutputs = {};

  try {
    // 1. Find Start Node (Trigger)
    let startNodeId = Object.keys(graph).find(id => {
      const node = graph[id];
      return (node.name || '').toLowerCase().includes('trigger');
    }) || Object.keys(graph)[0];

    if (!startNodeId) {
      return res.status(400).json({ error: 'No trigger node found!' });
    }

    // 2. Queue for BFS Graph Traversal
    const queue = [startNodeId];
    const visited = new Set();
    nodeOutputs[startNodeId] = {
      triggeredAt: new Date().toISOString(),
      status: "Triggered successfully",
      initialValue: "p1m workflow started"
    };

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const currentNode = graph[currentId];
      if (!currentNode) continue;

      const nodeType = (currentNode.name || '').toLowerCase();
      const inputData = nodeOutputs[currentId] || {};

      executionTrace.push({ id: currentId, name: currentNode.name, status: "running" });

      // Execute current node logic
      if (nodeType.includes('http')) {
        const targetUrl = currentNode.data.url || 'https://jsonplaceholder.typicode.com/todos/1';
        const method = (currentNode.data.method || 'GET').toUpperCase();
        
        try {
          const apiRes = await axios({
            method: method,
            url: targetUrl,
            timeout: 5000,
            data: method === 'POST' ? inputData : undefined
          });
          nodeOutputs[currentId] = { statusCode: apiRes.status, data: apiRes.data };
        } catch (apiErr) {
          nodeOutputs[currentId] = { error: apiErr.message };
        }
      } 
      else if (nodeType.includes('ai')) {
        const prompt = currentNode.data.prompt || "Analyze input data";
        nodeOutputs[currentId] = {
          prompt: prompt,
          aiResponse: `[p1m AI Agent]: Processed data from previous step. Summary: Found ${JSON.stringify(inputData).substring(0, 80)}...`
        };
      }

      // 3. Find connected children nodes via wire outputs
      const outputs = currentNode.outputs;
      if (outputs) {
        for (const outKey of Object.keys(outputs)) {
          const connections = outputs[outKey].connections || [];
          for (const conn of connections) {
            const targetId = String(conn.node);
            // Pass current node output as input for the child
            nodeOutputs[targetId] = { ...nodeOutputs[currentId] };
            queue.push(targetId);
          }
        }
      }
    }

    res.json({
      status: 'success',
      executedNodes: Array.from(visited),
      nodeOutputs: nodeOutputs,
      completedAt: new Date().toISOString()
    });

  } catch (err) {
    res.status(500).json({ status: 'failed', error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`p1m Engine running with True DAG graph solver on port ${PORT}`);
});
