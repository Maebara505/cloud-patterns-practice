const express = require('express');
const app = express();
const PORT = 3000;
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:4000/data';

// ==========================================
// 1. PATRÓN CIRCUIT BREAKER
// ==========================================
class CircuitBreaker {
  constructor(failureThreshold = 3, cooldownMs = 5000) {
    this.state = 'CLOSED'; // CLOSED | OPEN | HALF_OPEN
    this.failureCount = 0;
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
    this.nextAttempt = 0;
  }

  async execute(action) {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttempt) {
        this.state = 'HALF_OPEN';
        console.log(`  [CIRCUIT BREAKER] Cooldown terminado -> Estado: HALF_OPEN (probando servicio)`);
      } else {
        console.log(`  [CIRCUIT BREAKER] BLOQUEADO (Estado: OPEN). Rechazando peticion rapido.`);
        throw new Error('Circuit Breaker esta OPEN - Peticion rechazada inmediatamente');
      }
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    if (this.state === 'HALF_OPEN') {
      console.log(`  [CIRCUIT BREAKER] Prueba exitosa -> Estado: CLOSED (recuperado)`);
    }
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    console.log(`  [CIRCUIT BREAKER] Fallo registrado (${this.failureCount}/${this.failureThreshold})`);
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.cooldownMs;
      console.log(`  [CIRCUIT BREAKER] Umbral alcanzado -> Estado: OPEN por ${this.cooldownMs}ms`);
    }
  }
}

const breaker = new CircuitBreaker(3, 5000);

// ==========================================
// 2. PATRÓN TIMEOUT
// ==========================================
async function fetchWithTimeout(url, timeoutMs = 1500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`TIMEOUT: El servicio excedio el limite de ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ==========================================
// 3. PATRÓN RETRY (con Backoff)
// ==========================================
async function executeWithRetry(fn, maxRetries = 2, delayMs = 500) {
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.log(`  [RETRY] Intento ${attempt} fallo: ${error.message}`);
      if (attempt > maxRetries) {
        throw error;
      }
      const wait = delayMs * attempt;
      console.log(`  [RETRY] Reintentando en ${wait}ms...`);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
}

// ==========================================
// ENDPOINT PRINCIPAL
// ==========================================
app.get('/call', async (req, res) => {
  const mode = req.query.mode || 'ok';
  const useRetry = req.query.retry !== 'false';
  console.log(`\n---> Nueva peticion recibida (mode=${mode}, retry=${useRetry})`);

  try {
    const data = await breaker.execute(async () => {
      if (useRetry) {
        return await executeWithRetry(() => fetchWithTimeout(`${TARGET_URL}?mode=${mode}`, 1500), 2, 400);
      }
      return await fetchWithTimeout(`${TARGET_URL}?mode=${mode}`, 1500);
    });

    res.status(200).json({ circuitState: breaker.state, data });
  } catch (error) {
    res.status(503).json({ circuitState: breaker.state, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Servicio A - Cliente Resiliente] Corriendo en http://localhost:${PORT}`);
});