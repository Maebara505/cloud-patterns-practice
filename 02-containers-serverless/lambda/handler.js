export const handler = async (event) => {
  const mode = event?.queryStringParameters?.mode || 'ok';

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      service: 'aws-lambda-serverless',
      mode,
      timestamp: new Date().toISOString(),
      message: 'Respuesta ejecutada sin servidor aprovisionado en AWS Lambda',
    }),
  };
};