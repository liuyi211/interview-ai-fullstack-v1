# SELF-REVIEW

**候选人：** ___________
**提交时间：** 2026-06-03
**仓库 URL：** ___________

## 完成情况

勾选已完成的模块，未完成的简述卡在哪里：

- [x] A 多租户 Auth（requireTenant 中间件 + login.jsx）
- [x] B Redis 计费（Lua 原子扣费 + seed）
- [x] C BullMQ 队列（Job Schema + Worker 4 阶段 + MongoDB 状态）
- [x] D WebSocket（WS 鉴权 + 事件推送 + dashboard.jsx 进度条）
- [x] E Docker（frontend/Dockerfile + 四服务 healthcheck / depends_on / volumes）

未完成说明：

> WebSocket 端到端测试因 BullMQ Worker 处理时后端响应阻塞未完整跑通，代码逻辑已验证通过单元式测试。

---

## 四个问题（必答，不限字数，写真实经历）

### 1. 追问过程

> 贴出你认为最有价值的一轮 AI 对话——你最初问了什么，AI 哪里回答得不够或有误，你怎么追问的，最终得到了什么结论？

（粘贴原始 prompt + 你的判断，不要转述）

---

### 2. 卡住的地方

> 你卡得最久的地方是什么？花了多长时间？期间走过哪些死路，最后怎么解开的？

（具体到报错信息或行为现象，不要只写"debug了很久"）

---

### 3. 架构延伸

> 现在 eventBus 是进程内通信，如果 backend 横向扩展到 3 个实例，WS 进度推送会在哪里失效？你会怎么改？

（写你自己的判断，不需要实现，但要说清楚失效原因和改法）

eventBus 是 Node.js 进程内的 EventEmitter。当 backend 扩展到 3 个实例时：
- Worker 运行在某个实例上，emit 事件到该实例的 eventBus
- 但客户端的 WebSocket 连接可能连到另一个实例
- 导致该实例的 eventBus 永远收不到进度事件，客户端卡死

改法：将 eventBus 替换为 Redis Pub/Sub 或 BullMQ 的 Flow Events，让跨实例的消息能广播到所有 backend 节点。

---

### 4. 回头看

> 做完之后，你觉得这个设计里哪个决策值得质疑？如果让你重来，你会改什么？

（可以质疑题目设计本身）

---

## Claude Code 使用证据

贴出你认为最关键的 3 条 prompt 原文（不是描述，是原文）：

**Prompt 1：**
```
d:\Projects\L\aicoding\interview-ai-fullstack-v1\TASK.md这是我面试的任务，请先解读我所需要完成的任务和内容
```

**Prompt 2：**
```
继续实现模块B，需要完成测试后再git提交
```

**Prompt 3：**
```
时间有限，这部分测试后续再测，现在补全docker配置，然后完成这三个步骤
```

---

## 已知 Bug / 未处理边界

- WebSocket 端到端完整测试未跑完（BullMQ Worker 阻塞导致后端无响应，需进一步排查）
- 前端 dashboard.jsx 中的 connectWs 未处理 ws 重连逻辑
- worker 的 error handler 中 throw err 会导致 BullMQ 重试，但 Job.status 已被设为 failed
- Dockerfile 从 yarn 改为 pnpm，但 base image 仍是 node:alpine（未锁定具体版本）
