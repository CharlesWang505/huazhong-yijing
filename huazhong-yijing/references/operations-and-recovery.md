# 操作与续接

先加载当前可用的 `computer-use` 技能，遵循它的目标选择、截图、恢复和确认规则。下文补充本游戏遇到的特定问题，不代替电脑操控规范。

## 启动权限与 RUNASINVOKER

来源：用户于 2026-11-16 补充的解决办法。此前两次实战记录未验证此项；本次只录入文档，没有修改注册表或重启游戏。

当 `NSLG.exe` 启动要求管理员权限，或怀疑游戏与电脑操控进程权限不一致时，先核实启动方式和权限。`RUNASINVOKER` 让程序使用启动它的进程所具有的权限，不会授予管理员权限；从已提权的进程启动也不能据此保证普通权限。它不修复启动器 / 游戏本体绑定混用，不能把所有“找不到进程”都归因于提权。

该设置位于当前 Windows 用户的 `HKCU\Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers`，值名是 `NSLG.exe` 的完整路径，类型为 `REG_SZ`，数据为 `~ RUNASINVOKER`。它不会随游戏文件或技能分享包复制到新电脑；更换电脑、Windows 账户或安装路径后，需要按实际环境重新设置。

仅整理、分享或检查 skill 不授权修改注册表或重启游戏；实施修复时按当前用户授权和电脑技能约束操作。以下为 PowerShell 示例，`C:\Games\NSLG\NSLG.exe` 只是示例路径，必须替换为接收方实际安装路径：

```powershell
$gameExe = 'C:\Games\NSLG\NSLG.exe'
$compatKey = 'HKCU\Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers'
Test-Path -LiteralPath $gameExe -PathType Leaf
reg.exe query $compatKey /v $gameExe
```

路径不存在先纠正路径。记录查询到的原始类型、完整数据或“原来无此值”；不要将访问失败当作无此值。下方设置命令适用于原来没有该值的情况。`/f` 会覆盖已有值；若已有其他兼容性标志，先保留原值，调整时保留需要的其他标志，不能直接用示例抹掉原设置。

设置并重新查询：

```powershell
reg.exe add $compatKey /v $gameExe /t REG_SZ /d "~ RUNASINVOKER" /f
reg.exe query $compatKey /v $gameExe
```

确认命令成功、查询数据正确，再在允许重启时保存进度并正常退出、从普通权限入口重新启动游戏。按当前工具重新枚举窗口和游戏本体，验证截图与输入；已有进程的权限不会因写入此值即时改变。若仍需提权或无法操作，记录当前启动行为和错误，分别排查权限与窗口绑定，不扩大到其他程序或关闭 UAC。

撤销本次新增且仍只有该标志的值：

```powershell
reg.exe delete $compatKey /v $gameExe /f
```

删除命令移除这个路径对应的整个值，不是只删一个标志。原来已有设置时恢复原类型和完整数据；后来新增了其他标志时保留那些设置，仅撤销本次改动。撤销后重新查询，并在下次正常启动时验证。

此例只给启动器 `NSLG.exe` 设置兼容性标志，不自动为 `com.bilibili.nslg.exe` 或其他子进程设置；子进程是否提权要另外核实。换电脑先安装游戏、确认新路径，将 `$gameExe` 替换后再按上述步骤处理。

命令语义及权限含义已对照 Microsoft Learn；这不等于本次实测了游戏修复效果：

```text
https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/deployment/compatibility/compatibility-fixes-for-windows-8-windows-7-and-windows-vista
https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/reg-add
https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/reg-delete
https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/reg-query
```

## 游戏本体与启动器归属

2026-11-16 运行时，工具把“三国：谋定天下”的游戏窗口归到了启动器：

| 项目 | 本次观察 |
|---|---|
| 启动器进程 | `NSLG.exe`，具体安装路径由当前环境核实 |
| 游戏本体进程 | `com.bilibili.nslg.exe`，具体安装路径由当前环境核实 |
| 窗口句柄 | 运行时重新枚举，不复用历史数值 |
| 可用绑定变量 | `actualWindow` |
| 易被改写的字段 | `gameState.window` |

报错可能声称窗口“不再属于”某路径，而“当前归属”打印的又是同一路径。这不能证明游戏进程已经退出，更不需要先重启游戏。

先通过当前工具枚举的窗口核对真正目标，保留已成功观察和输入的绑定。若返回状态中的 `window.app` 被改成启动器，不要未经验证覆盖这个绑定。原会话与续接会话都曾因回用 `state.window` 而反复失败，保留实际游戏绑定后恢复。

本次历史修复用过经过实际进程核实的 `process:` 标识。它是故障证据，不授权下次猜测路径、编造句柄或绕过当前工具的目标选择规则。新运行应使用当前返回或允许重新获取的窗口；无法按当前接口恢复时报告具体限制。

## 一次输入后立即观察

以下示例假定 `actualWindow` 已按当前电脑技能选定，`gameState` 来自最新观察：

```javascript
globalThis.gameClick = async (x, y) => {
  const screenshotId = gameState?.screenshots?.[0]?.id;
  if (!screenshotId) throw new Error('Observe the game before acting');
  globalThis.gameState = null;
  await sky.click({ window: actualWindow, screenshotId, x, y });
  globalThis.gameState = await sky.get_window_state({
    window: actualWindow,
    include_screenshot: true,
    include_text: false
  });
};
```

每次调用结束后检查截图，再选择下一次输入。输入或刷新失败时状态未知，重新观察后判断是否已生效，避免重复提交。不要用循环把整手牌的点击连续发完。

截图由工具自动显示，直接检查。不要为查看而再次解码、保存或重发截图数据。本游戏无障碍文本读不到牌名，截图是主要证据；仅在有具体需要时读取无障碍树。

动画中的分数会逐项累加。提交后看到跳动数字不代表最终伤害，等新手牌、稳定血量或结果页出现后记账。截图刷新应围绕状态变化，避免无目的连续截图。

## 牌面重叠与选中状态

初始窗口约 1437 x 749，牌名容易被底边和相邻牌遮住。可以逐步点选被遮挡牌，使其抬起以辨认，并观察选中边框；必要时按用户提出的办法先确认前两张和后两张。辨认操作仍须单步刷新。

区分“选中用于观察”“选中准备出牌”“选中准备弃牌”。准备提交前核对最终完整集合；此前试选过的牌不应被无意带进弃牌。重复牌用左到右序号记录，不能只写牌名。

历史坐标只作定位线索：牌中心 x 大致 330、442、548、660、772、884、1000、1110，y 约 650；出牌约 (1300,333)，弃牌约 (1300,411)。分辨率、窗口尺寸、模态框和牌的抬起都会改变可点击区域，应从当前截图重新确定。

## 用户输入、暂停与恢复

遇到 `user input was detected in this window; call get_window_state before continuing`，先重新观察；检查手牌、选中牌和资源是否变化，再决定下一次输入。不要拿同一截图 ID 反复重试。

明确停止或暂停时终止输入。用户恢复后先刷新真实画面，不假定中断前的点击一定成功。用户只问“卡了吗”时，简短说明实际进度并继续已授权工作。

## 保存交接状态

在换关、商店结束、长时间中断前，把以下内容保存到任务自身的状态记录；不写进技能的永久状态：

- 最新目标、当前工作模式、授权范围及是否暂停。
- 当前关卡、地图进度、目标 / 血量 / 累计分、剩余出牌和弃牌。
- 按位置排列的手牌、哪些已选、准备出还是弃，最后一次输入是否确认生效。
- 全部已购增益、牌库变动、墨卷、已确认的洗牌次数。
- `pursuitArmed`、`armyTriggered`，未知值明确标未知。
- 可用窗口的来源和已验证绑定；截图 ID 恢复时重新取。
- 下一个尚未执行的动作，以及已修好的问题和已知计算偏差。

长对话恢复时先读这个短状态，再按需读原日志。不要每次从头重新诊断已经解决的问题，也不要让旧诊断请求覆盖当前的实战目标。

## 区分三种故障

| 现象 | 本例定位 | 后续处理 |
|---|---|---|
| 启动要求管理员权限，或核实存在操控权限不匹配 | 启动权限问题；用户补充了 RUNASINVOKER 方法 | 按上节确认路径、保留旧值、设置及重启验证；不据此推断窗口绑定已修好 |
| 能观察，但输入被窗口归属检查拒绝 | 启动器 / 游戏本体绑定混用 | 核对当前窗口，恢复已验证绑定，重新观察 |
| 模型还未继续生成就出现 `function_call_output requires call_id` | 旧对话压缩后的请求续接被接口拒绝 | 保存任务状态，检查请求及日志；在新对话重新观察并续做任务 |

原会话在 JSONL 第 1302 行出现压缩记录，第 1308 行附加工具结果没有 `call_id`，第 1310 行记录接口拒绝。可确认先后关系，不能据此确定是客户端、代理还是服务端哪一层制造了该缺失。

`fco_...` 是本地结果项 ID，不等于对应调用的 `call_id`。本次没有可靠配对的调用 ID，也没有修复旧线程；不要随意填 ID 或直接编辑活动会话库来宣称恢复。继续游戏成功只证明任务可以恢复。

排查 JSONL 时先找相关线程 ID，再按行流式 `JSON.parse`。只提取用户消息、可见进度、工具元数据和错误，避免一次输出整份日志及内嵌截图。若产品接口提供线程读取工具，按当前环境要求优先查找并使用。

## 通关验证

本次最终关六手为 239、193、212、225、180、218，总计 1267。第四手已到 869 超过 800，但仍完成余下两手，直到地图显示：进阶 9/9、飞将无双“已通关”、历史最高分 1267、800 分奖励勾选。

保留这样的界面证据后才结束“全通关”目标。技能复盘或算分自检不需要重置关卡、重新挑战或改动客户端。
