# 海豹钱包/背包插件调试说明

插件文件：

```text
sealdice-plugins/pc-wallet-probe.js
```

插件信息：

```text
名称：钱包与背包
作者：白羽
用途：记录当前 .pc 角色的钱包和物品
```

## 1. 安装插件

在海豹 WebUI：

```text
https://dice.issane.cn
-> 配置
-> 扩展功能
-> JavaScript 插件
-> 新建/上传插件
-> 粘贴 pc-wallet-probe.js 全文
-> 保存并启用
```

保存后刷新插件列表，应能看到：

```text
作者：白羽
介绍：记录当前 .pc 角色的钱包和物品；普通玩家可查询，管理员/群主/Master 可增减货币和物品。
```

## 2. 基础测试

在 QQ 群里：

```text
.pc new 测试用
.钱包探测
.钱包
.背包
```

期望：

```text
.钱包探测
```

能显示当前 PC 是 `测试用`。

## 3. 管理员改钱

管理员/群主/Master 可执行：

```text
.钱包 add 测试用 20
.钱包 spend 测试用 5
.钱包 set 测试用 100
.钱包
```

说明：

```text
add：增加货币
spend：消耗货币
set：直接设置余额
```

## 4. 管理员改物品

```text
.背包 add 测试用 急救包 1
.背包 add 测试用 子弹 12
.背包 del 测试用 子弹 2
.背包 set 测试用 火把 3
.背包
```

说明：

```text
add：增加物品
del：减少/消耗物品
set：直接设置数量，设为 0 会移除该物品
```

## 5. 查看日志

```text
.钱包 log
```

只允许管理员/群主/Master 查看最近操作记录。

## 6. 权限规则

```text
普通玩家：.钱包 / .背包 / .钱包探测
管理员及以上：钱包和背包的 add / spend / del / set / log
```

当前插件判断：

```text
ctx.privilegeLevel >= 50
```

也就是管理员、群主、Master 都可以改账。

## 7. 数据存储

插件按群隔离数据，存储 key：

```text
wallet:v1:<groupId>
```

角色名来自：

```text
ctx.player.name
```

所以先用：

```text
.pc new <角色名>
```

或：

```text
.pc tag <角色名>
```

再查询：

```text
.钱包
.背包
```

## 8. 服务器日志

如果插件没有反应：

```bash
cd /opt/sealdice-dice
sudo docker compose logs --tail=120 sealdice
```

如果保存插件时报错，重新复制 `pc-wallet-probe.js` 全文，不要漏掉开头的 `// ==UserScript==` 元数据。
