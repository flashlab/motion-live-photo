# Motion Live Photo - 后端运行模式配置

本项目已经配置为支持后端运行模式，前端和后端在同一个容器中运行。

## 部署方式

### 1. Docker部署（推荐）

使用单个Docker容器同时运行前端和后端服务：

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

访问地址：http://localhost:3000

### 2. 本地开发

不使用Docker，在本地开发：

```bash
# 安装依赖
npm install

# 启动后端（在一个终端）
npm run dev:server

# 启动前端（在另一个终端）
npm run dev
```

## 环境变量

### 后端环境变量
- `PORT`: 后端服务端口（默认：3000）
- `NODE_ENV`: 运行环境（development/production）
- `CORS_ORIGIN`: CORS允许的源（默认：*）
- `HOSTNAME`: 监听地址（默认：0.0.0.0）

### 前端环境变量
- `BACKEND_URL`: 后端服务地址
- `FRONTEND_PORT`: 前端服务端口
- `CORS_ORIGIN`: CORS允许的源

## API接口

### 文件上传
- `POST /api/upload` - 单文件上传
- `POST /api/upload-multiple` - 多文件上传
- `GET /api/files/:filename` - 获取文件信息
- `DELETE /api/files/:filename` - 删除文件

### 系统接口
- `GET /api/health` - 健康检查
- `POST /api/proxy/*` - 代理请求（用于处理CORS）

## 跨域问题解决

1. **后端CORS配置**：后端服务器已配置CORS，允许跨域请求
2. **代理配置**：前端开发服务器已配置代理，将API请求转发到后端
3. **Docker网络**：容器间通过Docker网络通信，避免跨域问题

## 文件存储

- 上传的文件存储在 `./uploads` 目录
- 在Docker环境中，该目录会被挂载为volume
- 文件可以通过 `/uploads` 路径访问

## 健康检查

后端服务包含健康检查接口：
```bash
curl http://localhost:3000/api/health
```

## 故障排除

### 1. 端口冲突
如果端口被占用，可以修改docker-compose.yml中的端口映射：
```yaml
ports:
  - "3001:3000"  # 将后端端口改为3001
  - "5174:5173"  # 将前端端口改为5174
```

### 2. 权限问题
确保uploads目录有正确的权限：
```bash
sudo chown -R $USER:$USER ./uploads
chmod -R 755 ./uploads
```

### 3. 网络问题
检查容器网络连接：
```bash
docker network ls
docker network inspect motion-live-photo-network
```

### 4. 日志查看
查看容器日志：
```bash
docker logs motion-live-photo-app
docker logs motion-live-photo-backend
docker logs motion-live-photo-frontend
```

## 构建和部署

### 重新构建
```bash
# 重新构建镜像
docker-compose build

# 强制重新构建
docker-compose build --no-cache
```

### 清理资源
```bash
# 清理停止的容器
docker-compose down -v

# 清理所有相关资源
docker-compose down -v --rmi all
```

## 生产环境建议

1. **配置反向代理**：使用Nginx或Apache处理SSL和负载均衡
2. **设置环境变量**：根据实际环境配置CORS和其他参数
3. **监控和日志**：配置日志收集和监控
4. **数据备份**：定期备份uploads目录

## 性能优化

1. **静态资源CDN**：将静态文件部署到CDN
2. **文件压缩**：启用Gzip压缩
3. **缓存策略**：配置适当的缓存头
4. **负载均衡**：在高并发场景下使用负载均衡