# 画中杀境实战 Skill

面向《三国：谋定天下》画中杀境的 Codex 技能，整理了两次实战中的选牌算分、构筑决策、电脑操作和中断恢复经验，并附带独立的 Node.js 算分脚本。

## 安装

从本仓库的 [Releases](https://github.com/CharlesWang505/huazhong-shajing/releases) 下载 `huazhong-shajing-v1.0.0.zip`，解压后把整个 `huazhong-shajing` 文件夹放入个人技能目录：

```text
Windows: %USERPROFILE%\.agents\skills\huazhong-shajing\
macOS / Linux: ~/.agents/skills/huazhong-shajing/
```

也可以使用项目根目录下的 `.agents/skills/huazhong-shajing/`。确认该目录下直接包含 `SKILL.md`，并一起保留 `agents`、`references`、`scripts`。已有同名技能时先比较并保留自己的修改。

Codex 未发现新技能时重启客户端，再开启对话使用：

```text
使用 $huazhong-shajing，帮我分析画中杀境的当前手牌。
```

完整安装与使用条件见 [分享说明](分享说明.md)。

## 内容

- 识别当前手牌、已购增益和跨手状态，枚举最多六张牌的组合。
- 计分修正：点将成阵的三张门槛、点名追击的跨手保留、稀有共鸣的品质计数。
- 普通关弃牌、保留核心组合和进阶构筑的判断依据。
- Computer Use 误认启动器与游戏本体时的窗口绑定恢复。
- 用户补充的 `RUNASINVOKER` 启动权限处理，包括查询、设置、验证、撤销和换电脑说明。
- 对话中断后的状态交接，以及游戏结算和完整通关的确认方法。

## 算分脚本

需要 Node.js，依赖均为内置模块，无需 `npm install`。以下命令在仓库根目录运行：

```powershell
node ./huazhong-shajing/scripts/adviser.mjs --demo
node ./huazhong-shajing/scripts/adviser.mjs --catalog
node ./huazhong-shajing/scripts/adviser.mjs --input ./run-state.json
node --test ./huazhong-shajing/scripts/adviser.test.mjs
```

输入格式见 [SKILL.md](huazhong-shajing/SKILL.md)。输出的 `indices` 是当前手牌从左到右、从 1 开始的位置；重复牌按位置区分。脚本预测当前单手分数，不预测随机抽牌或整关最优策略，也不会自动操作游戏。

## 资料

| 文件 | 内容 |
|---|---|
| [SKILL.md](huazhong-shajing/SKILL.md) | 技能入口、工作流程、输入格式 |
| [计分与决策](huazhong-shajing/references/rules-and-strategy.md) | 规则、增益与构筑经验 |
| [操作与续接](huazhong-shajing/references/operations-and-recovery.md) | 启动权限、窗口绑定、操作和恢复步骤 |
| [两次会话复盘](huazhong-shajing/references/run-retrospective.md) | 已观察问题、处理依据和证据边界 |

## 适用范围

规则基于 2026-11-16 的实战观察，以当前游戏预览和结算为校验依据。未实现的增益会明确报错；本技能不覆盖所有版本和增益。

实际操控游戏需要 Windows、游戏客户端，以及接收方 Codex 环境可用的 `computer-use` 能力。只阅读规则和复盘不需要启动游戏；本仓库不包含电脑操控插件、游戏文件、原始聊天日志或账号信息。

`RUNASINVOKER` 方法来自用户后续补充，本次整理没有重新实测该修复。注册表设置只针对当前 Windows 账户和指定程序路径，安装技能不会自动应用设置。启动权限、窗口绑定和旧对话请求格式错误需要分别判断，详见操作资料。
