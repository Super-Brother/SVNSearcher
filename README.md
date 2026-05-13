# SVN Searcher

跨平台 SVN 目录检索桌面客户端

## 功能特性

- **SVN 账号密码登录** - 使用 `electron.safeStorage` 加密存储凭证，支持多仓库管理
- **目录树浏览** - 可视化浏览 SVN 仓库结构，支持懒加载和搜索过滤
- **文件名搜索** - 基于 Fuse.js 的模糊搜索，离线快速检索
- **内容搜索** - 在文件中搜索文本内容，支持批量检索
- **版本历史** - 查看文件提交记录和变更详情
- **文件下载** - 从 SVN 仓库直接下载文件到本地
- **定期刷新** - 可配置自动刷新间隔，保持索引最新

## 技术栈

- **Electron 28** - 跨平台桌面应用框架
- **React 18** - UI 组件库
- **TypeScript 5.3** - 类型安全
- **Ant Design 5** - 企业级 UI 组件（中文语言包）
- **Zustand 4** - 轻量级状态管理
- **Vite 5** (electron-vite 2) - 构建工具
- **Fuse.js 7** - 模糊搜索引擎
- **xml2js** - SVN CLI XML 输出解析
- **electron-store** - 本地持久化存储

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器（热重载）
npm run dev

# 构建应用
npm run build

# 预览生产构建
npm run preview

# 代码检查
npm run lint

# TypeScript 类型检查
npm run typecheck
```

## 打包

```bash
# Windows（NSIS 安装包 + 便携版）
npm run build:win

# macOS（DMG + ZIP，支持 x64 和 arm64）
npm run build:mac

# Linux（AppImage + deb）
npm run build:linux
```

## 项目结构

```
src/
├── main/                      # Electron 主进程
│   ├── index.ts               # 入口：窗口创建、IPC 注册
│   ├── modules/
│   │   ├── auth/credential-store.ts   # 凭证加密存储
│   │   └── svn/executor.ts           # SVN CLI 封装
│   └── services/
│       ├── search-service.ts         # 索引与搜索服务
│       └── refresh-scheduler.ts      # 定时刷新调度
├── preload/
│   └── index.ts               # contextBridge API 暴露
└── renderer/                  # React 前端
    ├── components/            # UI 组件
    ├── pages/                 # 页面（Login、Main）
    ├── stores/                # Zustand 状态管理
    └── types/                 # TypeScript 类型声明
```

## 架构说明

应用采用标准 Electron 三进程架构：

- **主进程** - 管理窗口、处理系统操作、执行 SVN 命令、管理本地索引
- **预加载脚本** - 通过 `contextBridge` 安全暴露 API 给渲染进程
- **渲染进程** - React SPA，负责 UI 展示和用户交互

数据流：登录 → 拉取索引 → 文件名搜索（离线）/ 内容搜索（在线） → 文件下载

## 系统要求

- **Windows**: Windows 7 及以上
- **macOS**: macOS 10.13 及以上
- **Linux**: 主流发行版

## 前置条件

需要安装 SVN 命令行工具：

- **Windows**: 安装 [TortoiseSVN](https://tortoisesvn.net/) 或 [CollabNet SVN](https://www.collab.net/downloads/subversion)
- **macOS**: `brew install subversion`
- **Linux**: `sudo apt install subversion` 或 `sudo yum install subversion`

## 许可证

MIT
