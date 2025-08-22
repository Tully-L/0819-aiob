// cloudfunctions/auth/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 身份验证云函数
 */
exports.main = async (event, context) => {
  const { action } = event
  const { OPENID } = cloud.getWXContext()
  
  try {
    switch (action) {
      case 'login':
        return await handleLogin(event, OPENID)
      case 'register':
        return await handleRegister(event, OPENID)
      case 'checkRole':
        return await checkUserRole(OPENID)
      case 'getUserInfo':
        return await getUserInfo(OPENID)
      case 'updateUserInfo':
        return await updateUserInfo(event, OPENID)
      default:
        return createError('INVALID_PARAMETER', '未知操作')
    }
  } catch (error) {
    console.error('身份验证云函数错误:', error)
    return createError('SYSTEM_ERROR', error.message)
  }
}

/**
 * 处理用户登录
 */
async function handleLogin(event, openid) {
  const { userInfo } = event
  
  if (!userInfo) {
    return createError('VALIDATION_ERROR', '用户信息不能为空')
  }
  
  try {
    // 查找用户是否已存在
    const userResult = await db.collection('drivers').where({
      _openid: openid
    }).get()
    
    if (userResult.data.length > 0) {
      // 用户已存在，更新登录时间
      const user = userResult.data[0]
      await db.collection('drivers').doc(user._id).update({
        data: {
          lastLoginTime: new Date(),
          avatarUrl: userInfo.avatarUrl,
          nickName: userInfo.nickName
        }
      })
      
      return createSuccess({
        user: user,
        isNewUser: false
      }, '登录成功')
    } else {
      // 新用户，返回需要注册的标识
      return createSuccess({
        user: null,
        isNewUser: true,
        openid: openid
      }, '需要完成注册')
    }
  } catch (error) {
    console.error('登录处理失败:', error)
    return createError('DATABASE_ERROR', '登录失败')
  }
}

/**
 * 处理用户注册
 */
async function handleRegister(event, openid) {
  const { driverInfo } = event
  
  if (!driverInfo) {
    return createError('VALIDATION_ERROR', '司机信息不能为空')
  }
  
  // 验证必填字段
  if (!driverInfo.name || !driverInfo.employeeId || !driverInfo.phone) {
    return createError('VALIDATION_ERROR', '姓名、工号和手机号不能为空')
  }
  
  // 验证手机号格式
  if (!validatePhone(driverInfo.phone)) {
    return createError('VALIDATION_ERROR', '手机号格式不正确')
  }
  
  // 验证工号格式
  if (!validateEmployeeId(driverInfo.employeeId)) {
    return createError('VALIDATION_ERROR', '工号格式不正确')
  }
  
  try {
    // 检查工号是否已存在
    const employeeIdCheck = await db.collection('drivers').where({
      employeeId: driverInfo.employeeId
    }).get()
    
    if (employeeIdCheck.data.length > 0) {
      return createError('BUSINESS_ERROR', '工号已存在')
    }
    
    // 检查手机号是否已存在
    const phoneCheck = await db.collection('drivers').where({
      phone: driverInfo.phone
    }).get()
    
    if (phoneCheck.data.length > 0) {
      return createError('BUSINESS_ERROR', '手机号已被注册')
    }
    
    // 创建新用户
    const newDriver = {
      _openid: openid,
      name: driverInfo.name.trim(),
      employeeId: driverInfo.employeeId.trim(),
      phone: driverInfo.phone,
      role: 'driver', // 默认角色为司机
      status: 'active',
      avatarUrl: driverInfo.avatarUrl || '',
      nickName: driverInfo.nickName || '',
      createdAt: new Date(),
      lastLoginTime: new Date()
    }
    
    const result = await db.collection('drivers').add({
      data: newDriver
    })
    
    newDriver._id = result._id
    
    return createSuccess({
      user: newDriver
    }, '注册成功')
    
  } catch (error) {
    console.error('注册处理失败:', error)
    if (error.message && error.message.includes('duplicate key')) {
      return createError('BUSINESS_ERROR', '工号或手机号已存在')
    }
    return createError('DATABASE_ERROR', '注册失败')
  }
}

/**
 * 检查用户角色
 */
async function checkUserRole(openid) {
  try {
    const result = await db.collection('drivers').where({
      _openid: openid
    }).get()
    
    if (result.data.length === 0) {
      return createSuccess({
        role: null,
        user: null,
        isNewUser: true
      }, '用户不存在')
    }
    
    const user = result.data[0]
    
    // 检查用户状态
    if (user.status !== 'active') {
      return createError('AUTH_ERROR', '账户已被停用')
    }
    
    return createSuccess({
      role: user.role,
      user: user,
      isNewUser: false
    }, '获取用户角色成功')
    
  } catch (error) {
    console.error('检查用户角色失败:', error)
    return createError('DATABASE_ERROR', '获取用户信息失败')
  }
}

/**
 * 获取用户信息
 */
async function getUserInfo(openid) {
  try {
    const result = await db.collection('drivers').where({
      _openid: openid
    }).get()
    
    if (result.data.length === 0) {
      return createError('AUTH_ERROR', '用户不存在')
    }
    
    const user = result.data[0]
    
    // 移除敏感信息
    delete user._openid
    
    return createSuccess(user, '获取用户信息成功')
    
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return createError('DATABASE_ERROR', '获取用户信息失败')
  }
}

/**
 * 更新用户信息
 */
async function updateUserInfo(event, openid) {
  const { userInfo } = event
  
  if (!userInfo) {
    return createError('VALIDATION_ERROR', '用户信息不能为空')
  }
  
  try {
    // 查找用户
    const userResult = await db.collection('drivers').where({
      _openid: openid
    }).get()
    
    if (userResult.data.length === 0) {
      return createError('AUTH_ERROR', '用户不存在')
    }
    
    const user = userResult.data[0]
    
    // 准备更新数据
    const updateData = {
      updatedAt: new Date()
    }
    
    // 只允许更新特定字段
    if (userInfo.name) {
      updateData.name = userInfo.name.trim()
    }
    
    if (userInfo.phone && validatePhone(userInfo.phone)) {
      // 检查新手机号是否已被其他用户使用
      const phoneCheck = await db.collection('drivers').where({
        phone: userInfo.phone,
        _id: db.command.neq(user._id)
      }).get()
      
      if (phoneCheck.data.length > 0) {
        return createError('BUSINESS_ERROR', '手机号已被其他用户使用')
      }
      
      updateData.phone = userInfo.phone
    }
    
    if (userInfo.avatarUrl) {
      updateData.avatarUrl = userInfo.avatarUrl
    }
    
    if (userInfo.nickName) {
      updateData.nickName = userInfo.nickName
    }
    
    // 更新用户信息
    await db.collection('drivers').doc(user._id).update({
      data: updateData
    })
    
    return createSuccess(null, '用户信息更新成功')
    
  } catch (error) {
    console.error('更新用户信息失败:', error)
    return createError('DATABASE_ERROR', '更新用户信息失败')
  }
}

/**
 * 验证手机号
 */
function validatePhone(phone) {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

/**
 * 验证工号
 */
function validateEmployeeId(employeeId) {
  // 工号格式：字母+数字，长度3-20
  const employeeIdRegex = /^[A-Za-z0-9]{3,20}$/
  return employeeIdRegex.test(employeeId)
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