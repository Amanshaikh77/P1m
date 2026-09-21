const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.static('public'));

app.post('/api/run-workflow', async (req, res) => {
  const { graph } = req.body;
  
  if (!graph) {
    return res.status(400).json({ error: 'No graph data received' });
  }

  const logs = [];
  let contextData = { initialMessage: "Trigger started at " + new Date().toLocaleTimeString() };

  try {
    // Traverse through nodes in the graph
    for (const key of Object.keys(graph)) {
      const node = graph[key];
      const nodeType = node.name.toLowerCase();

      if (nodeType.includes('trigger') || nodeType.includes('webhook')) {
        logs.push(`[Step 1] Trigger Node processed. Initial data created.`);
      } else if (nodeType.includes('http')) {
        logs.push(`[Step 2] HTTP Request Node running... Fetching real API data.`);
        
        // Calling a real public test API
        const apiRes = await axios.get('https://jsonplaceholder.typicode.com/todos/1');
        contextData.apiResult = apiRes.data;
        logs.push(`[Step 2 Success] Fetched Title: "${apiRes.data.title}"`);
      }
    }

    res.json({
      status: 'success',
      totalNodes: Object.keys(graph).length,
      logs: logs,
      outputData: contextData
    });
  } catch (err) {
    res.status(500).json({ status: 'failed', error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`p1m Engine upgraded! Running at http://localhost:${PORT}`);
});
