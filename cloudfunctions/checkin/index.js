// cloudfunctions/checkin/index.js
const cloud = require('wx-server-sdk')
const AuthMiddleware = require('../common/auth-middleware')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 打卡功能云函数
 */
exports.main = async (event, context) => {
  const { action } = event
  const { OPENID } = cloud.getWXContext()
  
  try {
    // 验证用户身份（司机或管理员）
    const user = await AuthMiddleware.verifyDriver(OPENID)
    
    switch (action) {
      case 'checkin':
        return await handleCheckin(event, user)
      case 'getStatus':
        return await getTodayStatus(user)
      case 'getHistory':
        return await getCheckinHistory(event, user)
      case 'getDriverCheckins':
        // 管理员查看指定司机的打卡记录
        await AuthMiddleware.verifyAdmin(OPENID)
        return await getDriverCheckins(event)
      default:
        return createError('INVALID_PARAMETER', '未知操作')
    }
  } catch (error) {
    console.error('打卡云函数错误:', error)
    if (error.message.includes('权限')) {
      return createError('AUTH_ERROR', error.message)
    }
    return createError('SYSTEM_ERROR', error.message)
  }
}

/**
 * 处理司机打卡
 */
async function handleCheckin(event, user) {
  const { data } = event
  const { location } = data
  
  if (!location || !location.latitude || !location.longitude) {
    return createError('VALIDATION_ERROR', '位置信息不能为空')
  }
  
  try {
    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    
    // 检查今日是否已打卡
    const existingCheckin = await db.collection('checkins').where({
      _openid: user._openid,
      date: today
    }).get()
    
    if (existingCheckin.data.length > 0) {
      return createError('BUSINESS_ERROR', '今日已打卡')
    }
    
    // 获取打卡时间配置
    const configResult = await db.collection('system_config').where({
      key: 'checkin_time'
    }).get()
    
    let checkinConfig = {
      startTime: '08:00',
      endTime: '08:30',
      lateThreshold: 30
    }
    
    if (configResult.data.length > 0) {
      checkinConfig = configResult.data[0].value
    }
    
    // 判断打卡状态
    const checkinStatus = determineCheckinStatus(now, checkinConfig)
    
    // 获取地址信息（可选）
    let address = `纬度: ${location.latitude.toFixed(6)}, 经度: ${location.longitude.toFixed(6)}`
    
    // 创建打卡记录
    const checkinRecord = {
      _openid: user._openid,
      driverId: user._id,
      driverName: user.name,
      employeeId: user.employeeId,
      checkinTime: now,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        address: address
      },
      status: checkinStatus,
      date: today,
      createdAt: now
    }
    
    const result = await db.collection('checkins').add({
      data: checkinRecord
    })
    
    // 记录操作日志
    console.log(`司机打卡: ${user.name} (${user.employeeId}) - ${checkinStatus}`)
    
    return createSuccess({
      checkinId: result._id,
      status: checkinStatus,
      checkinTime: now.toLocaleString('zh-CN'),
      location: checkinRecord.location
    }, '打卡成功')
    
  } catch (error) {
    console.error('打卡处理失败:', error)
    return createError('DATABASE_ERROR', '打卡失败')
  }
}

/**
 * 获取今日打卡状态
 */
async function getTodayStatus(user) {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    const result = await db.collection('checkins').where({
      _openid: user._openid,
      date: today
    }).get()
    
    if (result.data.length === 0) {
      return createSuccess({
        hasCheckedIn: false,
        checkinTime: null,
        status: null,
        location: null
      })
    }
    
    const checkin = result.data[0]
    
    return createSuccess({
      hasCheckedIn: true,
      checkinTime: checkin.checkinTime.toLocaleString('zh-CN'),
      status: checkin.status,
      location: checkin.location
    })
    
  } catch (error) {
    console.error('获取今日状态失败:', error)
    return createError('DATABASE_ERROR', '获取打卡状态失败')
  }
}

/**
 * 获取打卡历史记录
 */
async function getCheckinHistory(event, user) {
  try {
    const { data = {} } = event
    const { page = 1, limit = 20, startDate, endDate } = data
    
    let query = db.collection('checkins').where({
      _openid: user._openid
    })
    
    // 日期范围筛选
    if (startDate && endDate) {
      query = query.where({
        date: db.command.gte(startDate).and(db.command.lte(endDate))
      })
    }
    
    const result = await query
      .orderBy('checkinTime', 'desc')
      .skip((page - 1) * limit)
      .limit(limit)
      .get()
    
    // 格式化数据
    const formattedData = result.data.map(item => ({
      _id: item._id,
      date: item.date,
      checkinTime: item.checkinTime.toLocaleString('zh-CN'),
      status: item.status,
      location: item.location
    }))
    
    return createSuccess(formattedData)
    
  } catch (error) {
    console.error('获取打卡历史失败:', error)
    return createError('DATABASE_ERROR', '获取打卡历史失败')
  }
}

/**
 * 获取指定司机的打卡记录（管理员功能）
 */
async function getDriverCheckins(event) {
  try {
    const { data = {} } = event
    const { driverId, page = 1, limit = 20, startDate, endDate } = data
    
    if (!driverId) {
      return createError('VALIDATION_ERROR', '司机ID不能为空')
    }
    
    let query = db.collection('checkins').where({
      driverId: driverId
    })
    
    // 日期范围筛选
    if (startDate && endDate) {
      query = query.where({
        date: db.command.gte(startDate).and(db.command.lte(endDate))
      })
    }
    
    const result = await query
      .orderBy('checkinTime', 'desc')
      .skip((page - 1) * limit)
      .limit(limit)
      .get()
    
    // 格式化数据
    const formattedData = result.data.map(item => ({
      _id: item._id,
      date: item.date,
      checkinTime: item.checkinTime.toLocaleString('zh-CN'),
      status: item.status,
      location: item.location,
      driverName: item.driverName,
      employeeId: item.employeeId
    }))
    
    return createSuccess(formattedData)
    
  } catch (error) {
    console.error('获取司机打卡记录失败:', error)
    return createError('DATABASE_ERROR', '获取司机打卡记录失败')
  }
}

/**
 * 判断打卡状态
 */
function determineCheckinStatus(checkinTime, config) {
  const checkinHour = checkinTime.getHours()
  const checkinMinute = checkinTime.getMinutes()
  const checkinTotalMinutes = checkinHour * 60 + checkinMinute
  
  // 解析配置时间
  const [startHour, startMinute] = config.startTime.split(':').map(Number)
  const [endHour, endMinute] = config.endTime.split(':').map(Number)
  
  const startTotalMinutes = startHour * 60 + startMinute
  const endTotalMinutes = endHour * 60 + endMinute
  const lateThreshold = config.lateThreshold || 30
  
  // 判断打卡状态
  if (checkinTotalMinutes < startTotalMinutes) {
    // 早于开始时间，算正常
    return 'normal'
  } else if (checkinTotalMinutes <= endTotalMinutes) {
    // 在规定时间内，算正常
    return 'normal'
  } else if (checkinTotalMinutes <= endTotalMinutes + lateThreshold) {
    // 在迟到阈值内，算迟到
    return 'late'
  } else {
    // 超过迟到阈值，算缺勤
    return 'missed'
  }
}

/**
 * 验证位置信息
 */
function validateLocation(location) {
  if (!location) return false
  
  const { latitude, longitude } = location
  
  // 验证纬度范围
  if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
    return false
  }
  
  // 验证经度范围
  if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
    return false
  }
  
  return true
}

/**
 * 计算两点间距离（米）
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const radLat1 = lat1 * Math.PI / 180.0
  const radLat2 = lat2 * Math.PI / 180.0
  const a = radLat1 - radLat2
  const b = lng1 * Math.PI / 180.0 - lng2 * Math.PI / 180.0
  let s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)))
  s = s * 6378.137 // 地球半径
  s = Math.round(s * 10000) / 10000
  return s * 1000 // 转换为米
}

/**
 * 检查是否在允许的打卡区域内（可选功能）
 */
function isInAllowedArea(location, allowedAreas = []) {
  if (allowedAreas.length === 0) {
    // 如果没有设置允许区域，则不限制
    return true
  }
  
  for (const area of allowedAreas) {
    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      area.latitude,
      area.longitude
    )
    
    if (distance <= area.radius) {
      return true
    }
  }
  
  return false
}

/**
 * 获取打卡统计信息
 */
async function getCheckinStats(driverId, startDate, endDate) {
  try {
    let query = db.collection('checkins').where({
      driverId: driverId
    })
    
    if (startDate && endDate) {
      query = query.where({
        date: db.command.gte(startDate).and(db.command.lte(endDate))
      })
    }
    
    const result = await query.get()
    const checkins = result.data
    
    const stats = {
      total: checkins.length,
      normal: checkins.filter(c => c.status === 'normal').length,
      late: checkins.filter(c => c.status === 'late').length,
      missed: checkins.filter(c => c.status === 'missed').length
    }
    
    return stats
  } catch (error) {
    console.error('获取打卡统计失败:', error)
    return null
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