FROM node:20-alpine AS web-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js postcss.config.js tailwind.config.js ./
COPY public ./public
COPY src ./src
ENV VITE_SHARECHARGE_DATA_MODE=api
ENV VITE_SHARECHARGE_APP=all
ENV VITE_SHARECHARGE_API_URL=https://sharecharge.onrender.com
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev
COPY server/ .
COPY --from=web-build /app/dist ./public
# APK binaries (commit public/downloads/*.apk or sync before docker build)
COPY public/downloads ./public/downloads
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "src/index.js"]
