const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.static('public'));

app.post('/api/run-workflow', async (req, res) => {
  const { graph } = req.body;
  if (!graph) return res.status(400).json({ error: 'No graph received' });

  const logs = [];
  const results = {};

  try {
    for (const id of Object.keys(graph)) {
      const node = graph[id];
      const data = node.data || {};

      if (node.name === 'trigger') {
        logs.push(`[Node ${id}] Trigger fired successfully.`);
      } else if (node.name === 'http') {
        const targetUrl = data.url || 'https://jsonplaceholder.typicode.com/posts/1';
        const method = data.method || 'GET';
        
        logs.push(`[Node ${id}] Fetching (${method}): ${targetUrl}`);
        const apiResponse = await axios({ method, url: targetUrl, timeout: 5000 });
        results[`node_${id}`] = apiResponse.data;
        logs.push(`[Node ${id} Success] Status: ${apiResponse.status}`);
      } else {
        logs.push(`[Node ${id}] Action processed.`);
      }
    }

    res.json({
      status: 'success',
      totalNodes: Object.keys(graph).length,
      logs,
      results,
      executedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'failed', error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`p1m running on port ${PORT}`));
