# EMR 前端镜像：Node 构建 + Nginx 托管 / 反向代理
# 构建：docker build -t emr-frontend ./frontend-vite

FROM node:20-alpine AS build
WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx-docker.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist /usr/share/nginx/html
EXPOSE 80
