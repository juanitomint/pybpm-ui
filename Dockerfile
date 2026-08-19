FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --silent

FROM node:22-alpine AS runtime
ENV NODE_ENV=development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
