FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tailwind.config.js tailwind.css ./
COPY site/ site/
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/site/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
