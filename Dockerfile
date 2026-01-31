FROM node:20-alpine AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN npm ci

FROM node:20-alpine AS production-dependencies-env
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev

FROM node:20-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN npm run build
# Compile migration script for production (tsx not available in prod)
RUN npx esbuild scripts/migrate.ts --bundle --platform=node --outfile=scripts/migrate.mjs --format=esm --external:postgres

FROM node:20-alpine
COPY ./package.json package-lock.json /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
# Include migrations and compiled migration script for release command
COPY --from=build-env /app/drizzle /app/drizzle
COPY --from=build-env /app/scripts/migrate.mjs /app/scripts/migrate.mjs
WORKDIR /app
CMD ["npm", "run", "start"]