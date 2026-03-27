# SVN Searcher

跨平台 SVN 目录检索桌面客户端

## 功能特性

- 🔐 **SVN 账号密码登录** - 安全存储凭证
- 📁 **目录树浏览** - 可视化浏览 SVN 仓库结构
- 🔍 **文件名搜索** - 模糊搜索文件和目录
- 📝 **内容搜索** - 在文件中搜索文本内容
- 📜 **版本历史** - 查看文件提交记录和变更详情
- 🔄 **定期刷新** - 可配置自动刷新间隔

## 技术栈

- **Electron** - 跨平台桌面应用框架
- **React 18** - UI 组件库
- **TypeScript** - 类型安全
- **Ant Design** - 企业级 UI 组件
- **Zustand** - 状态管理
- **Vite** - 构建工具

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建应用
npm run build

# 打包 Windows 版本
npm run build:win

# 打包 macOS 版本
npm run build:mac
```

## 系统要求

- **Windows**: Windows 7 及以上
- **macOS**: macOS 10.13 及以上

## 前置条件

需要安装 SVN 命令行工具：

- **Windows**: 安装 [TortoiseSVN](https://tortoisesvn.net/) 或 [CollabNet SVN](https://www.collab.net/downloads/subversion)
- **macOS**: `brew install subversion`

## 许可证

MIT