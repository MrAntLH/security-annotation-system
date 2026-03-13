# 阶段1：构建
FROM node:18-alpine AS build

WORKDIR /app

# 复制 package 文件
COPY package*.json ./
RUN npm install

# 复制源代码
COPY . .

# 构建
RUN npm run build

# 阶段2：Nginx 提供服务
FROM nginx:alpine

# 复制构建产物
COPY --from=build /app/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
