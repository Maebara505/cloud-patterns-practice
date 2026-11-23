const CLIENT_URL = 'http://localhost:3000/call';

async function runStep(title, query) {
  console.log(`\n==================================================`);
  console.log(`ESCENARIO: ${title}`);
  console.log(`==================================================`);
  const res = await fetch(`${CLIENT_URL}${query}`);
  const body = await res.json();
  console.log(`Status HTTP: ${res.status}`);
  console.log(`Respuesta:`, body);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  // 1. Funcionamiento normal
  await runStep('1. Peticion exitosa normal', '?mode=ok');

  // 2. Timeout + Retry (Servicio B tarda 3s, Timeout salta a los 1.5s y reintenta)
  await runStep('2. Timeout Pattern + Retry Pattern', '?mode=slow&retry=true');

  // 3. Provocar apertura del Circuit Breaker (2 fallos mas para llegar a 3)
  await runStep('3a. Fallo #2 hacia Circuit Breaker', '?mode=fail&retry=false');
  await runStep('3b. Fallo #3 -> Abre el Circuit Breaker (OPEN)', '?mode=fail&retry=false');

  // 4. Peticion rechazada al instante por Circuit Breaker OPEN
  await runStep('4. Circuit Breaker OPEN (rechazo inmediato)', '?mode=ok&retry=false');

  // 5. Esperar cooldown (5.5s) y recuperar el circuito (HALF_OPEN -> CLOSED)
  console.log(`\n... Esperando 5.5 segundos de cooldown del Circuit Breaker ...`);
  await sleep(5500);
  await runStep('5. Recuperacion (HALF_OPEN -> CLOSED)', '?mode=ok&retry=false');
}

main().catch(console.error);