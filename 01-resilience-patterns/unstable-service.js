const express = require('express');
const app = express();
const PORT = 4000;

app.get('/data', async (req, res) => {
  const mode = req.query.mode || 'ok';
  const timestamp = new Date().toISOString();

  if (mode === 'slow') {
    console.log(`[${timestamp}] [Servicio B] Simulando lentitud (3000ms)...`);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return res.status(200).json({ status: 'ok', message: 'Respuesta lenta completada' });
  }

  if (mode === 'fail') {
    console.log(`[${timestamp}] [Servicio B] Simulando fallo interno (HTTP 500)`);
    return res.status(500).json({ status: 'error', message: 'Fallo critico en Servicio B' });
  }

  console.log(`[${timestamp}] [Servicio B] Respondiendo correctamente (HTTP 200)`);
  return res.status(200).json({ status: 'ok', data: 'Datos procesados correctamente' });
});

app.listen(PORT, () => {
  console.log(`[Servicio B - Inestable] Corriendo en http://localhost:${PORT}`);
});