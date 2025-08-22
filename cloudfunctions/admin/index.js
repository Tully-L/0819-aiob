// cloudfunctions/admin/index.js
const cloud = require('wx-server-sdk')
const AuthMiddleware = require('../common/auth-middleware')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 管理员功能云函数
 */
exports.main = async (event, context) => {
  const { action } = event
  const { OPENID } = cloud.getWXContext()
  
  try {
    // 验证管理员权限（除了记录日志操作）
    if (action !== 'logOperation') {
      await AuthMiddleware.verifyAdmin(OPENID)
    }
    
    switch (action) {
      case 'getTodayStats':
        return await getTodayStats()
      case 'getDriverList':
        return await getDriverList(event)
      case 'getCallRecords':
        return await getCallRecords(event)
      case 'getSystemConfig':
        return await getSystemConfig()
      case 'updateSystemConfig':
        return await updateSystemConfig(event)
      case 'exportData':
        return await exportData(event)
      case 'logOperation':
        return await logOperation(event, OPENID)
      case 'addDriver':
        return await addDriver(event)
      case 'updateDriver':
        return await updateDriver(event)
      case 'deleteDriver':
        return await deleteDriver(event)
      default:
        return createError('INVALID_PARAMETER', '未知操作')
    }
  } catch (error) {
    console.error('管理员云函数错误:', error)
    if (error.message.includes('权限')) {
      return createError('AUTH_ERROR', error.message)
    }
    return createError('SYSTEM_ERROR', error.message)
  }
}

/**
 * 获取今日统计数据
 */
async function getTodayStats() {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // 获取所有司机数量
    const driversResult = await db.collection('drivers').where({
      status: 'active'
    }).count()
    
    const totalDrivers = driversResult.total
    
    // 获取今日打卡记录
    const checkinsResult = await db.collection('checkins').where({
      date: today
    }).get()
    
    const checkins = checkinsResult.data
    const checkedIn = checkins.length
    const notCheckedIn = totalDrivers - checkedIn
    const lateDrivers = checkins.filter(c => c.status === 'late').length
    
    // 获取未打卡司机列表
    const checkedInDriverIds = checkins.map(c => c.driverId)
    const uncheckedDriversResult = await db.collection('drivers').where({
      status: 'active',
      _id: db.command.nin(checkedInDriverIds)
    }).get()
    
    return createSuccess({
      stats: {
        totalDrivers,
        checkedIn,
        notCheckedIn,
        lateDrivers
      },
      uncheckedDrivers: uncheckedDriversResult.data
    })
  } catch (error) {
    console.error('获取今日统计失败:', error)
    return createError('DATABASE_ERROR', '获取统计数据失败')
  }
}

/**
 * 获取司机列表
 */
async function getDriverList(event) {
  try {
    const { page = 1, limit = 20, status = 'all' } = event.data || {}
    
    let query = db.collection('drivers')
    
    if (status !== 'all') {
      query = query.where({ status: status })
    }
    
    const result = await query
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * limit)
      .limit(limit)
      .get()
    
    return createSuccess(result.data)
  } catch (error) {
    console.error('获取司机列表失败:', error)
    return createError('DATABASE_ERROR', '获取司机列表失败')
  }
}

/**
 * 获取外呼记录
 */
async function getCallRecords(event) {
  try {
    const { page = 1, limit = 20, startDate, endDate } = event.data || {}
    
    let query = db.collection('call_records')
    
    if (startDate && endDate) {
      query = query.where({
        callTime: db.command.gte(new Date(startDate)).and(db.command.lte(new Date(endDate)))
      })
    }
    
    const result = await query
      .orderBy('callTime', 'desc')
      .skip((page - 1) * limit)
      .limit(limit)
      .get()
    
    return createSuccess(result.data)
  } catch (error) {
    console.error('获取外呼记录失败:', error)
    return createError('DATABASE_ERROR', '获取外呼记录失败')
  }
}

/**
 * 获取系统配置
 */
async function getSystemConfig() {
  try {
    const result = await db.collection('system_config').get()
    
    const config = {}
    result.data.forEach(item => {
      config[item.key] = item.value
    })
    
    return createSuccess(config)
  } catch (error) {
    console.error('获取系统配置失败:', error)
    return createError('DATABASE_ERROR', '获取系统配置失败')
  }
}

/**
 * 更新系统配置
 */
async function updateSystemConfig(event) {
  try {
    const { configKey, configValue } = event.data
    
    if (!configKey || configValue === undefined) {
      return createError('VALIDATION_ERROR', '配置键和值不能为空')
    }
    
    // 查找配置是否存在
    const existingConfig = await db.collection('system_config').where({
      key: configKey
    }).get()
    
    if (existingConfig.data.length > 0) {
      // 更新现有配置
      await db.collection('system_config').doc(existingConfig.data[0]._id).update({
        data: {
          value: configValue,
          updatedAt: new Date()
        }
      })
    } else {
      // 创建新配置
      await db.collection('system_config').add({
        data: {
          key: configKey,
          value: configValue,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
    }
    
    return createSuccess(null, '配置更新成功')
  } catch (error) {
    console.error('更新系统配置失败:', error)
    return createError('DATABASE_ERROR', '更新系统配置失败')
  }
}

/**
 * 导出数据
 */
async function exportData(event) {
  try {
    const { type, startDate, endDate } = event.data || {}
    
    let data = []
    
    switch (type) {
      case 'checkins':
        const checkinsQuery = db.collection('checkins')
        if (startDate && endDate) {
          checkinsQuery.where({
            date: db.command.gte(startDate).and(db.command.lte(endDate))
          })
        }
        const checkinsResult = await checkinsQuery.get()
        data = checkinsResult.data
        break
        
      case 'drivers':
        const driversResult = await db.collection('drivers').get()
        data = driversResult.data
        break
        
      case 'calls':
        const callsQuery = db.collection('call_records')
        if (startDate && endDate) {
          callsQuery.where({
            callTime: db.command.gte(new Date(startDate)).and(db.command.lte(new Date(endDate)))
          })
        }
        const callsResult = await callsQuery.get()
        data = callsResult.data
        break
        
      default:
        return createError('VALIDATION_ERROR', '不支持的导出类型')
    }
    
    return createSuccess(data, '数据导出成功')
  } catch (error) {
    console.error('导出数据失败:', error)
    return createError('DATABASE_ERROR', '导出数据失败')
  }
}

/**
 * 记录操作日志
 */
async function logOperation(event, openid) {
  try {
    const { logData } = event
    
    if (!logData) {
      return createError('VALIDATION_ERROR', '日志数据不能为空')
    }
    
    // 获取用户信息
    const user = await AuthMiddleware.verifyUser(openid)
    
    const logEntry = {
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      operation: logData.operation,
      details: logData.details || {},
      timestamp: new Date(),
      ip: logData.ip || 'unknown',
      page: logData.page || 'unknown'
    }
    
    // 这里可以选择将日志保存到数据库或仅在控制台输出
    console.log('用户操作日志:', JSON.stringify(logEntry, null, 2))
    
    // 如果需要持久化日志，取消下面的注释
    /*
    await db.collection('operation_logs').add({
      data: logEntry
    })
    */
    
    return createSuccess(null, '日志记录成功')
  } catch (error) {
    console.error('记录操作日志失败:', error)
    return createError('SYSTEM_ERROR', '记录日志失败')
  }
}

/**
 * 添加司机
 */
async function addDriver(event) {
  try {
    const { driverInfo } = event.data
    
    if (!driverInfo || !driverInfo.name || !driverInfo.employeeId || !driverInfo.phone) {
      return createError('VALIDATION_ERROR', '司机信息不完整')
    }
    
    // 检查工号是否已存在
    const existingDriver = await db.collection('drivers').where({
      employeeId: driverInfo.employeeId
    }).get()
    
    if (existingDriver.data.length > 0) {
      return createError('BUSINESS_ERROR', '工号已存在')
    }
    
    const newDriver = {
      name: driverInfo.name,
      employeeId: driverInfo.employeeId,
      phone: driverInfo.phone,
      role: 'driver',
      status: 'active',
      createdAt: new Date()
    }
    
    const result = await db.collection('drivers').add({
      data: newDriver
    })
    
    return createSuccess({ _id: result._id, ...newDriver }, '司机添加成功')
  } catch (error) {
    console.error('添加司机失败:', error)
    return createError('DATABASE_ERROR', '添加司机失败')
  }
}

/**
 * 更新司机信息
 */
async function updateDriver(event) {
  try {
    const { driverId, driverInfo } = event.data
    
    if (!driverId || !driverInfo) {
      return createError('VALIDATION_ERROR', '司机ID和信息不能为空')
    }
    
    const updateData = {
      updatedAt: new Date()
    }
    
    if (driverInfo.name) updateData.name = driverInfo.name
    if (driverInfo.phone) updateData.phone = driverInfo.phone
    if (driverInfo.status) updateData.status = driverInfo.status
    
    await db.collection('drivers').doc(driverId).update({
      data: updateData
    })
    
    return createSuccess(null, '司机信息更新成功')
  } catch (error) {
    console.error('更新司机信息失败:', error)
    return createError('DATABASE_ERROR', '更新司机信息失败')
  }
}

/**
 * 删除司机
 */
async function deleteDriver(event) {
  try {
    const { driverId } = event.data
    
    if (!driverId) {
      return createError('VALIDATION_ERROR', '司机ID不能为空')
    }
    
    // 软删除：将状态设置为inactive
    await db.collection('drivers').doc(driverId).update({
      data: {
        status: 'inactive',
        deletedAt: new Date()
      }
    })
    
    return createSuccess(null, '司机删除成功')
  } catch (error) {
    console.error('删除司机失败:', error)
    return createError('DATABASE_ERROR', '删除司机失败')
  }
}

/**
 * 创建成功响应
 */
function createSuccess(data = null, message = '操作成功') {
  return {
    success: true,
    code: 0,
    message: message,
    data: data
  }
}

/**
 * 创建错误响应
 */
function createError(type, message) {
  const errorCodes = {
    'VALIDATION_ERROR': 4001,
    'BUSINESS_ERROR': 1001,
    'AUTH_ERROR': 3001,
    'DATABASE_ERROR': 2001,
    'SYSTEM_ERROR': 2000,
    'INVALID_PARAMETER': 4004
  }
  
  return {
    success: false,
    code: errorCodes[type] || 5000,
    message: message,
    type: type
  }
}