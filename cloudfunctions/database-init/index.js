// cloudfunctions/database-init/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 初始化数据库集合和索引
 */
exports.main = async (event, context) => {
  const { action } = event
  
  try {
    switch (action) {
      case 'createCollections':
        return await createCollections()
      case 'createIndexes':
        return await createIndexes()
      case 'initSystemConfig':
        return await initSystemConfig()
      case 'initCallTemplates':
        return await initCallTemplates()
      default:
        return { success: false, message: '未知操作' }
    }
  } catch (error) {
    console.error('数据库初始化失败:', error)
    return { success: false, message: error.message }
  }
}

/**
 * 创建数据库集合
 */
async function createCollections() {
  const collections = [
    'drivers',        // 司机信息表
    'checkins',       // 打卡记录表
    'call_records',   // 外呼记录表
    'system_config',  // 系统配置表
    'call_templates'  // 外呼模板表
  ]
  
  const results = []
  
  for (const collectionName of collections) {
    try {
      // 检查集合是否已存在
      const existingCollections = await db.listCollections()
      const exists = existingCollections.collections.some(col => col.name === collectionName)
      
      if (!exists) {
        await db.createCollection(collectionName)
        results.push(`集合 ${collectionName} 创建成功`)
      } else {
        results.push(`集合 ${collectionName} 已存在`)
      }
    } catch (error) {
      results.push(`集合 ${collectionName} 创建失败: ${error.message}`)
    }
  }
  
  return { success: true, data: results }
}

/**
 * 创建数据库索引
 */
async function createIndexes() {
  const indexes = [
    // drivers 集合索引
    {
      collection: 'drivers',
      indexes: [
        { keys: { _openid: 1 }, name: 'openid_index' },
        { keys: { employeeId: 1 }, name: 'employee_id_index', unique: true },
        { keys: { phone: 1 }, name: 'phone_index' },
        { keys: { status: 1 }, name: 'status_index' }
      ]
    },
    // checkins 集合索引
    {
      collection: 'checkins',
      indexes: [
        { keys: { _openid: 1 }, name: 'openid_index' },
        { keys: { driverId: 1 }, name: 'driver_id_index' },
        { keys: { date: 1 }, name: 'date_index' },
        { keys: { status: 1 }, name: 'status_index' },
        { keys: { checkinTime: -1 }, name: 'checkin_time_desc_index' },
        { keys: { driverId: 1, date: 1 }, name: 'driver_date_index', unique: true }
      ]
    },
    // call_records 集合索引
    {
      collection: 'call_records',
      indexes: [
        { keys: { driverId: 1 }, name: 'driver_id_index' },
        { keys: { phone: 1 }, name: 'phone_index' },
        { keys: { status: 1 }, name: 'status_index' },
        { keys: { callTime: -1 }, name: 'call_time_desc_index' },
        { keys: { callId: 1 }, name: 'call_id_index', unique: true }
      ]
    },
    // system_config 集合索引
    {
      collection: 'system_config',
      indexes: [
        { keys: { key: 1 }, name: 'key_index', unique: true }
      ]
    },
    // call_templates 集合索引
    {
      collection: 'call_templates',
      indexes: [
        { keys: { templateId: 1 }, name: 'template_id_index' },
        { keys: { isActive: 1 }, name: 'is_active_index' }
      ]
    }
  ]
  
  const results = []
  
  for (const collectionIndex of indexes) {
    const { collection, indexes: collectionIndexes } = collectionIndex
    
    for (const index of collectionIndexes) {
      try {
        await db.collection(collection).createIndex({
          keys: index.keys,
          name: index.name,
          unique: index.unique || false
        })
        results.push(`${collection}.${index.name} 索引创建成功`)
      } catch (error) {
        if (error.message.includes('already exists')) {
          results.push(`${collection}.${index.name} 索引已存在`)
        } else {
          results.push(`${collection}.${index.name} 索引创建失败: ${error.message}`)
        }
      }
    }
  }
  
  return { success: true, data: results }
}

/**
 * 初始化系统配置
 */
async function initSystemConfig() {
  const configs = [
    {
      key: 'checkin_time',
      value: {
        startTime: '08:00',
        endTime: '08:30',
        lateThreshold: 30 // 迟到阈值(分钟)
      },
      description: '打卡时间配置',
      updatedAt: new Date()
    },
    {
      key: 'baidu_call_config',
      value: {
        accessKey: '', // 需要配置百度外呼的AccessKey
        secretKey: '', // 需要配置百度外呼的SecretKey
        endpoint: 'https://ccc.bj.baidubce.com',
        defaultTemplateId: 'template_001'
      },
      description: '百度外呼API配置',
      updatedAt: new Date()
    },
    {
      key: 'auto_call_config',
      value: {
        enabled: true,
        checkInterval: 30, // 检查间隔(分钟)
        maxRetries: 3,     // 最大重试次数
        retryInterval: 10  // 重试间隔(分钟)
      },
      description: '自动外呼配置',
      updatedAt: new Date()
    }
  ]
  
  const results = []
  
  for (const config of configs) {
    try {
      // 检查配置是否已存在
      const existing = await db.collection('system_config').where({
        key: config.key
      }).get()
      
      if (existing.data.length === 0) {
        await db.collection('system_config').add({
          data: config
        })
        results.push(`系统配置 ${config.key} 初始化成功`)
      } else {
        results.push(`系统配置 ${config.key} 已存在`)
      }
    } catch (error) {
      results.push(`系统配置 ${config.key} 初始化失败: ${error.message}`)
    }
  }
  
  return { success: true, data: results }
}

/**
 * 初始化外呼模板
 */
async function initCallTemplates() {
  const templates = [
    {
      name: '未打卡提醒',
      templateId: 'template_001',
      content: '您好，您今天还未完成打卡，请及时打卡。按1确认收到，按2需要请假。',
      params: ['driverName', 'currentTime'],
      isActive: true,
      createdAt: new Date()
    },
    {
      name: '迟到提醒',
      templateId: 'template_002', 
      content: '您好，您今天打卡迟到了，请注意准时打卡。按1确认收到。',
      params: ['driverName', 'lateMinutes'],
      isActive: true,
      createdAt: new Date()
    }
  ]
  
  const results = []
  
  for (const template of templates) {
    try {
      // 检查模板是否已存在
      const existing = await db.collection('call_templates').where({
        templateId: template.templateId
      }).get()
      
      if (existing.data.length === 0) {
        await db.collection('call_templates').add({
          data: template
        })
        results.push(`外呼模板 ${template.name} 初始化成功`)
      } else {
        results.push(`外呼模板 ${template.name} 已存在`)
      }
    } catch (error) {
      results.push(`外呼模板 ${template.name} 初始化失败: ${error.message}`)
    }
  }
  
  return { success: true, data: results }
}