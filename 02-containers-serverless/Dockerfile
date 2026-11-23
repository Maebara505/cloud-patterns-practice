FROM node:20-alpine

WORKDIR /usr/src/app

COPY app/package*.json ./
RUN npm install --omit=dev

COPY app/unstable-service.js app/resilient-client.js ./

EXPOSE 3000 4000

CMD ["sh", "-c", "node unstable-service.js & node resilient-client.js"]