FROM node:24-alpine
ENV NODE_ENV=production

WORKDIR /home/node/app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

RUN addgroup -S fluidproxy && adduser -S fluidproxy -G fluidproxy
USER fluidproxy

CMD [ "node", "app.js" ]