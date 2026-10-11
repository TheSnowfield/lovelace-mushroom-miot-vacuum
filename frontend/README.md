# Miot Vacuum Map Card

本项目是基于 Mushroom 的社区分支，由社区第三方开发者使用 AI 创建，不由 Mushroom 项目或其维护者维护。本项目不承诺永久可靠或持续可用。

用于 Home Assistant 的扫地机器人地图卡片，包含地图渲染、交互控件、操作按钮和可视化编辑器。

卡片类型：`custom:miot-map-vacuum-card`。

安装和配置见[项目文档](../README.md)。

已确认可用的设备型号见[地图支持列表](../README.md#地图支持列表)。

## 构建

```sh
npm ci
npm run typecheck
npm run build
```

将 `dist/miot-vacuum-map.js` 作为 Home Assistant JavaScript Module 资源加载。

## 许可证

[Apache-2.0](LICENSE)。第三方代码来源与版权声明见 [NOTICE](NOTICE) 和 [THIRD_PARTY_LICENSES](THIRD_PARTY_LICENSES)。
