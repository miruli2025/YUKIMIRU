# MEMORY.md

## 2026-02-14
- 初次上线，Miru 给我起名 Kumo（☁️）
- Miru 偏好：中文沟通、有话直说、解决问题导向

## 2026-02-16
- 每日自动化流水线上线：JST 0:00 抓数据→排名卡片→粉雪预警→TG推送
- 粉雪预警系统：新雪≥20cm + 气温≤-3°C + 风速<15m/s
- 粉雪卡片定稿：暗色粉紫主题（gen-xhs-powder-final.js）
- 域名 yukimiru.com 注册（Cloudflare Registrar），另误买了 yuki-miru.com
- GitHub: miruli2025/YUKIMIRU，Vercel 部署成功（yukimiru.vercel.app）
- Vercel 迁移进行中：DNS 配置待完成，数据层需改造（SQLite→静态JSON）
- Miru 无技术背景，手把手指导 GitHub/Cloudflare/Vercel 注册配置
- 服务器2GB频繁OOM，Vercel 是正确选择

## 2026-02-15
- SkiDash Japan v1.0.0 发版（git tag）
- UI 风格确定：glassmorphism 暗色主题（Miru 不喜欢 Apple 极简风）
- 评分徽章：药丸形、半透明青色底+描边+青色字、`/100`同行右侧
- QA 流程：先出测试计划→Miru 确认→再执行（PM→Dev→QA 模式）
- 小红书图片：Noto Sans SC 字体、青色分数、固定列宽对齐
- Miru 无开发背景，技术概念要通俗解释
- 版本号从 v1.0.0 起步
