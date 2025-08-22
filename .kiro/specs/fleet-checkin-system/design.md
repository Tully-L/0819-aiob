# 车队打卡及自动外呼系统设计文档

## 概述

本系统是基于微信云开发的车队管理小程序，集成百度智能外呼API，实现司机打卡管理和自动外呼通知功能。系统采用前后端分离架构，前端使用微信小程序，后端使用微信云开发的云函数和云数据库。

## 架构设计

### 整体架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   微信小程序     │    │   微信云开发     │    │   百度外呼API   │
│                 │    │                 │    │                 │
│  - 司机端界面   │◄──►│  - 云函数       │◄──►│  - 语音外呼     │
│  - 管理端界面   │    │  - 云数据库     │    │  - 按键识别     │
│  - 打卡功能     │    │  - 定时触发器   │    │  - 通话记录     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 技术栈

- **前端**: 微信小程序 + WeUI组件库
- **后端**: 微信云开发 (云函数 + 云数据库)
- **外呼服务**: 百度智能外呼API
- **定时任务**: 微信云开发定时触发器
- **数据存储**: 微信云数据库

## 组件和接口设计

### 前端组件结构

```
miniprogram/
├── pages/
│   ├── driver/              # 司机端页面
│   │   ├── checkin/         # 打卡页面
│   │   ├── profile/         # 个人信息
│   │   └── history/         # 打卡历史
│   ├── admin/               # 管理端页面
│   │   ├── dashboard/       # 数据看板
│   │   ├── drivers/         # 司机管理
│   │   ├── calls/           # 外呼记录
│   │   └── settings/        # 系统设置
│   └── auth/                # 身份验证
├── components/              # 公共组件
│   ├── checkin-card/        # 打卡卡片
│   ├── driver-list/         # 司机列表
│   └── call-record/         # 通话记录
└── utils/                   # 工具函数
    ├── auth.js              # 身份验证
    ├── location.js          # 位置服务
    └── api.js               # API调用
```

### 云函数结构

```
cloudfunctions/
├── auth/                    # 身份验证
├── checkin/                 # 打卡相关
├── driver/                  # 司机管理
├── call/                    # 外呼相关
├── admin/                   # 管理功能
└── scheduler/               # 定时任务
```

### 核心接口设计

#### 1. 身份验证接口

```javascript
// 云函数: auth
exports.main = async (event, context) => {
  const { action, userInfo } = event;
  
  switch(action) {
    case 'login':
      // 用户登录验证
      return await handleLogin(userInfo);
    case 'register':
      // 司机注册绑定
      return await handleRegister(userInfo);
    case 'checkRole':
      // 检查用户角色
      return await checkUserRole(context.OPENID);
  }
}
```

#### 2. 打卡接口

```javascript
// 云函数: checkin
exports.main = async (event, context) => {
  const { action, data } = event;
  
  switch(action) {
    case 'checkin':
      // 司机打卡
      return await handleCheckin(context.OPENID, data);
    case 'getHistory':
      // 获取打卡历史
      return await getCheckinHistory(context.OPENID, data);
    case 'getStatus':
      // 获取今日打卡状态
      return await getTodayStatus(context.OPENID);
  }
}
```

#### 3. 外呼接口

```javascript
// 云函数: call
exports.main = async (event, context) => {
  const { action, data } = event;
  
  switch(action) {
    case 'makeCall':
      // 发起外呼
      return await makeCall(data);
    case 'handleCallback':
      // 处理外呼回调
      return await handleCallback(data);
    case 'getCallRecords':
      // 获取外呼记录
      return await getCallRecords(data);
  }
}
```

#### 4. 百度外呼API集成

```javascript
// 百度外呼API调用
const baiduCallAPI = {
  // 发起外呼
  async makeCall(phone, templateId, params) {
    const response = await wx.request({
      url: 'https://ccc.bj.baidubce.com/v1/call/outbound',
      method: 'POST',
      header: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        callee: phone,
        templateId: templateId,
        params: params
      }
    });
    return response.data;
  },
  
  // 获取通话记录
  async getCallRecord(callId) {
    const response = await wx.request({
      url: `https://ccc.bj.baidubce.com/v1/call/${callId}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    return response.data;
  }
}
```

## 数据模型设计

### 1. 司机信息表 (drivers)

```javascript
{
  _id: "driver_id",
  _openid: "user_openid",
  name: "司机姓名",
  employeeId: "工号",
  phone: "手机号码",
  role: "driver", // driver | admin
  status: "active", // active | inactive
  createdAt: Date,
  updatedAt: Date
}
```

### 2. 打卡记录表 (checkins)

```javascript
{
  _id: "checkin_id",
  _openid: "user_openid",
  driverId: "司机ID",
  checkinTime: Date,
  location: {
    latitude: Number,
    longitude: Number,
    address: "详细地址"
  },
  status: "normal", // normal | late | missed
  date: "2024-01-01", // 日期字符串，便于查询
  createdAt: Date
}
```

### 3. 外呼记录表 (call_records)

```javascript
{
  _id: "call_id",
  driverId: "司机ID",
  phone: "外呼号码",
  callId: "百度外呼ID",
  status: "completed", // pending | completed | failed
  duration: Number, // 通话时长(秒)
  result: "confirmed", // confirmed | no_answer | busy | failed
  cost: Number, // 费用(分)
  callTime: Date,
  endTime: Date,
  createdAt: Date
}
```

### 4. 系统配置表 (system_config)

```javascript
{
  _id: "config_id",
  key: "checkin_time", // 配置键
  value: {
    startTime: "08:00",
    endTime: "08:30",
    lateThreshold: 30 // 迟到阈值(分钟)
  },
  description: "打卡时间配置",
  updatedAt: Date
}
```

### 5. 外呼模板表 (call_templates)

```javascript
{
  _id: "template_id",
  name: "未打卡提醒",
  templateId: "百度模板ID",
  content: "您好，您今天还未完成打卡，请及时打卡。按1确认收到，按2需要请假。",
  params: ["driverName", "currentTime"],
  isActive: true,
  createdAt: Date
}
```

## 错误处理

### 错误分类

1. **业务错误**: 用户操作相关错误
2. **系统错误**: 服务器内部错误
3. **网络错误**: API调用失败
4. **权限错误**: 用户权限不足

### 错误处理策略

```javascript
// 统一错误处理
const errorHandler = {
  // 业务错误
  BUSINESS_ERROR: {
    ALREADY_CHECKED_IN: { code: 1001, message: '今日已打卡' },
    INVALID_TIME: { code: 1002, message: '不在打卡时间范围内' },
    DRIVER_NOT_FOUND: { code: 1003, message: '司机信息不存在' }
  },
  
  // 系统错误
  SYSTEM_ERROR: {
    DATABASE_ERROR: { code: 2001, message: '数据库操作失败' },
    API_ERROR: { code: 2002, message: 'API调用失败' }
  },
  
  // 权限错误
  AUTH_ERROR: {
    UNAUTHORIZED: { code: 3001, message: '用户未授权' },
    FORBIDDEN: { code: 3002, message: '权限不足' }
  }
}
```

## 测试策略

### 单元测试

- 云函数逻辑测试
- 数据模型验证测试
- 工具函数测试

### 集成测试

- 微信小程序与云函数交互测试
- 百度外呼API集成测试
- 数据库操作测试

### 端到端测试

- 完整打卡流程测试
- 自动外呼流程测试
- 管理后台功能测试

### 测试用例示例

```javascript
// 打卡功能测试
describe('打卡功能测试', () => {
  test('正常打卡', async () => {
    const result = await checkinFunction({
      action: 'checkin',
      data: {
        location: { latitude: 39.9042, longitude: 116.4074 }
      }
    });
    expect(result.success).toBe(true);
  });
  
  test('重复打卡', async () => {
    // 第二次打卡应该失败
    const result = await checkinFunction({
      action: 'checkin',
      data: {
        location: { latitude: 39.9042, longitude: 116.4074 }
      }
    });
    expect(result.code).toBe(1001);
  });
});
```

### 性能测试

- 并发打卡测试 (50人同时打卡)
- 外呼API响应时间测试
- 数据库查询性能测试

## 安全考虑

### 数据安全

1. **敏感数据加密**: 手机号码等敏感信息加密存储
2. **HTTPS传输**: 所有API调用使用HTTPS
3. **访问控制**: 基于角色的权限控制

### 权限管理

```javascript
// 权限验证中间件
const authMiddleware = async (openid, requiredRole) => {
  const user = await db.collection('drivers').where({
    _openid: openid
  }).get();
  
  if (!user.data.length) {
    throw new Error('用户不存在');
  }
  
  const userRole = user.data[0].role;
  if (requiredRole && userRole !== requiredRole) {
    throw new Error('权限不足');
  }
  
  return user.data[0];
}
```

### API安全

1. **请求频率限制**: 防止恶意调用
2. **参数验证**: 严格验证输入参数
3. **日志记录**: 记录所有敏感操作

## 部署和运维

### 部署流程

1. **开发环境**: 本地开发和测试
2. **测试环境**: 云开发测试环境
3. **生产环境**: 云开发正式环境

### 监控和日志

```javascript
// 日志记录
const logger = {
  info: (message, data) => {
    console.log(`[INFO] ${new Date().toISOString()} ${message}`, data);
  },
  error: (message, error) => {
    console.error(`[ERROR] ${new Date().toISOString()} ${message}`, error);
    // 可以集成到微信云开发的日志服务
  }
}
```

### 备份策略

1. **数据库备份**: 每日自动备份云数据库
2. **代码备份**: Git版本控制
3. **配置备份**: 系统配置定期导出

## 成本估算

### 微信云开发费用

- **基础版资源包**: ¥300-600/年
- **数据库读写**: 包含在资源包内
- **云函数调用**: 包含在资源包内
- **存储空间**: 包含在资源包内

### 百度外呼费用

- **语音通知**: ¥0.1/分钟
- **按键识别**: ¥0.01/次
- **月均估算**: 50人 × 3次 × ¥0.1 = ¥15/月
- **年费估算**: ¥180-230/年

### 总成本

- **开发费用**: ¥6000 (一次性)
- **年运营费用**: ¥530-830/年