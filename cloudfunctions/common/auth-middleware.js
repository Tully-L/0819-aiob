// cloudfunctions/common/auth-middleware.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 权限验证中间件
 */
class AuthMiddleware {
  
  /**
   * 验证用户身份
   */
  static async verifyUser(openid) {
    try {
      const result = await db.collection('drivers').where({
        _openid: openid
      }).get()
      
      if (result.data.length === 0) {
        throw new Error('用户不存在')
      }
      
      const user = result.data[0]
      
      if (user.status !== 'active') {
        throw new Error('账户已被停用')
      }
      
      return user
    } catch (error) {
      console.error('用户验证失败:', error)
      throw error
    }
  }
  
  /**
   * 验证管理员权限
   */
  static async verifyAdmin(openid) {
    try {
      const user = await this.verifyUser(openid)
      
      if (user.role !== 'admin') {
        throw new Error('权限不足，需要管理员权限')
      }
      
      return user
    } catch (error) {
      console.error('管理员权限验证失败:', error)
      throw error
    }
  }
  
  /**
   * 验证司机权限
   */
  static async verifyDriver(openid) {
    try {
      const user = await this.verifyUser(openid)
      
      if (user.role !== 'driver' && user.role !== 'admin') {
        throw new Error('权限不足，需要司机权限')
      }
      
      return user
    } catch (error) {
      console.error('司机权限验证失败:', error)
      throw error
    }
  }
  
  /**
   * 验证资源所有权（用户只能访问自己的资源）
   */
  static async verifyResourceOwnership(openid, resourceOpenid) {
    try {
      const user = await this.verifyUser(openid)
      
      // 管理员可以访问所有资源
      if (user.role === 'admin') {
        return user
      }
      
      // 普通用户只能访问自己的资源
      if (openid !== resourceOpenid) {
        throw new Error('权限不足，只能访问自己的资源')
      }
      
      return user
    } catch (error) {
      console.error('资源所有权验证失败:', error)
      throw error
    }
  }
  
  /**
   * 检查用户是否有特定操作权限
   */
  static async checkPermission(openid, action, resource = null) {
    try {
      const user = await this.verifyUser(openid)
      
      // 管理员拥有所有权限
      if (user.role === 'admin') {
        return { allowed: true, user: user }
      }
      
      // 根据操作类型检查权限
      switch (action) {
        case 'checkin':
          // 司机可以打卡
          return { allowed: user.role === 'driver', user: user }
          
        case 'view_own_data':
          // 用户可以查看自己的数据
          return { allowed: true, user: user }
          
        case 'view_all_data':
          // 只有管理员可以查看所有数据
          return { allowed: user.role === 'admin', user: user }
          
        case 'manage_drivers':
          // 只有管理员可以管理司机
          return { allowed: user.role === 'admin', user: user }
          
        case 'make_calls':
          // 只有管理员可以发起外呼
          return { allowed: user.role === 'admin', user: user }
          
        case 'system_config':
          // 只有管理员可以修改系统配置
          return { allowed: user.role === 'admin', user: user }
          
        default:
          return { allowed: false, user: user }
      }
    } catch (error) {
      console.error('权限检查失败:', error)
      return { allowed: false, user: null, error: error.message }
    }
  }
  
  /**
   * 记录用户操作日志
   */
  static async logUserAction(openid, action, details = {}) {
    try {
      const user = await this.verifyUser(openid)
      
      const logData = {
        userId: user._id,
        userRole: user.role,
        userName: user.name,
        action: action,
        details: details,
        timestamp: new Date(),
        ip: details.ip || 'unknown'
      }
      
      // 这里可以将日志保存到数据库或发送到日志服务
      console.log('用户操作日志:', JSON.stringify(logData, null, 2))
      
      // 如果需要持久化日志，可以保存到数据库
      // await db.collection('user_logs').add({ data: logData })
      
    } catch (error) {
      console.error('记录用户操作日志失败:', error)
    }
  }
  
  /**
   * 生成JWT令牌（如果需要的话）
   */
  static generateToken(user) {
    // 这里可以使用JWT库生成令牌
    // 暂时返回简单的用户信息
    return {
      userId: user._id,
      role: user.role,
      name: user.name,
      employeeId: user.employeeId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时后过期
    }
  }
  
  /**
   * 验证令牌
   */
  static verifyToken(token) {
    try {
      // 这里可以使用JWT库验证令牌
      // 暂时进行简单的过期时间检查
      if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
        throw new Error('令牌已过期')
      }
      
      return token
    } catch (error) {
      console.error('令牌验证失败:', error)
      throw error
    }
  }
  
  /**
   * 创建权限错误响应
   */
  static createAuthError(message = '权限不足') {
    return {
      success: false,
      code: 3001,
      message: message,
      type: 'AUTH_ERROR'
    }
  }
  
  /**
   * 创建成功响应
   */
  static createSuccess(data = null, message = '操作成功') {
    return {
      success: true,
      code: 0,
      message: message,
      data: data
    }
  }
}

module.exports = AuthMiddleware