FROM node:alpine

# Set the working directory in the container to /app
WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "start"]
