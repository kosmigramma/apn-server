FROM node:14

WORKDIR /app
COPY package.json server.ts ./
RUN npm install

CMD npm start
