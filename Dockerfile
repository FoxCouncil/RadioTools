FROM node:14

# Create app directory
WORKDIR /usr/src/radiotools

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "node", "index.js" ]