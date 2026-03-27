# 资源文件目录

此目录用于存放应用程序的图标和资源文件。

## 需要的文件

### 图标文件
- `icon.ico` - Windows 应用图标 (256x256)
- `icon.icns` - macOS 应用图标 (512x512)
- `icons/` - Linux 图标目录

### 如何生成图标

可以使用以下工具从 PNG 生成图标：
- **Windows**: [png2ico](https://www.winterdrache.de/freeware/png2ico/)
- **macOS**: `iconutil` 命令行工具
- **在线工具**: [icoconvert.com](https://icoconvert.com/)

## 临时方案

开发阶段可以暂时不提供图标，electron-builder 会使用默认图标。
打包正式版本时需要提供自定义图标。