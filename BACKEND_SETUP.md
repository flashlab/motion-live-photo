# Motion Live Photo - 服务器端运行模式配置

本项目已完全转换为服务器端架构，使用 Node.js + Express + FFmpeg 进行服务器端媒体处理，提供更好的性能和可靠性。

## 部署方式

### 1. Docker部署（推荐）

使用单个Docker容器同时运行前端和后端服务，内置FFmpeg支持：

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重新构建（如有代码更改）
docker-compose build --no-cache
```

访问地址：http://localhost:3000

### 2. 本地开发

在本地开发环境中运行：

```bash
# 安装依赖
npm install

# 启动后端服务器（终端1）
npm run dev:server

# 启动前端开发服务器（终端2）
npm run dev
```

访问地址：http://localhost:5173

## 系统要求

### 服务器要求
- Node.js 18+
- FFmpeg (Docker镜像中已包含)
- 至少 1GB RAM
- 存储空间用于上传文件

### 本地开发要求
- Node.js 18+
- FFmpeg (需要单独安装)
  - macOS: `brew install ffmpeg`
  - Ubuntu: `sudo apt install ffmpeg`
  - Windows: 下载FFmpeg并添加到PATH

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

### FFmpeg处理接口
- `POST /api/ffmpeg/process` - 使用FFmpeg处理文件（转换、压缩、裁剪等）
- `POST /api/ffmpeg/extract-video` - 从动态照片中提取视频
- `POST /api/ffmpeg/extract-frame` - 从视频中提取帧
- `GET /api/ffmpeg/info` - 获取FFmpeg系统信息

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

## 架构改进

### 从浏览器端到服务器端的转变

本项目已经从原来的浏览器端FFmpeg处理完全转换为服务器端架构，主要改进包括：

#### 优势
1. **性能提升**：服务器端FFmpeg处理比浏览器端WebAssembly版本更快
2. **内存管理**：更好的内存管理，避免浏览器内存限制
3. **文件大小支持**：支持更大的文件处理
4. **稳定性**：减少浏览器崩溃和处理中断
5. **安全性**：文件处理在服务器端进行，更安全

#### 技术栈
- **前端**：React + TypeScript + Vite
- **后端**：Node.js + Express
- **媒体处理**：FFmpeg (fluent-ffmpeg)
- **文件上传**：Multer
- **部署**：Docker + Docker Compose

#### 处理流程
1. 用户上传文件到服务器
2. 服务器使用FFmpeg进行媒体处理
3. 处理完成后自动清理临时文件
4. 返回处理结果给前端
5. 前端显示处理后的文件