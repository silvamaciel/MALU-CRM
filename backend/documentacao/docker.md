# Dockerfile
- FROM node:20-slim
- WORKDIR /usr/src/app
- EXPOSE 5000
- CMD [ "node", "server.js" ]
