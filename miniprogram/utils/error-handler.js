// utils/error-handler.js

/**
 * 错误处理工具类
 */
class ErrorHandler {
  
  // 错误代码定义
  static ERROR_CODES = {
    // 业务错误 (1000-1999)
    BUSINESS_ERROR: {
      ALREADY_CHECKED_IN: { code: 1001, message: '今日已打卡' },
      INVALID_TIME: { code: 1002, message: '不在打卡时间范围内' },
      DRIVER_NOT_FOUND: { code: 1003, message: '司机信息不存在' },
      INVALID_LOCATION: { code: 1004, message: '位置信息无效' },
      DUPLICATE_EMPLOYEE_ID: { code: 1005, message: '工号已存在' },
      INVALID_PHONE: { code: 1006, message: '手机号格式不正确' },
      CALL_IN_PROGRESS: { code: 1007, message: '外呼正在进行中' },
      TEMPLATE_NOT_FOUND: { code: 1008, message: '外呼模板不存在' }
    },
    
    // 系统错误 (2000-2999)
    SYSTEM_ERROR: {
      DATABASE_ERROR: { code: 2001, message: '数据库操作失败' },
      API_ERROR: { code: 2002, message: 'API调用失败' },
      NETWORK_ERROR: { code: 2003, message: '网络连接失败' },
      CLOUD_FUNCTION_ERROR: { code: 2004, message: '云函数执行失败' },
      BAIDU_API_ERROR: { code: 2005, message: '百度外呼API调用失败' },
      CONFIG_ERROR: { code: 2006, message: '系统配置错误' }
    },
    
    // 权限错误 (3000-3999)
    AUTH_ERROR: {
      UNAUTHORIZED: { code: 3001, message: '用户未授权' },
      FORBIDDEN: { code: 3002, message: '权限不足' },
      TOKEN_EXPIRED: { code: 3003, message: '登录已过期' },
      INVALID_USER: { code: 3004, message: '用户信息无效' },
      ROLE_NOT_ALLOWED: { code: 3005, message: '用户角色不允许此操作' }
    },
    
    // 验证错误 (4000-4999)
    VALIDATION_ERROR: {
      REQUIRED_FIELD: { code: 4001, message: '必填字段不能为空' },
      INVALID_FORMAT: { code: 4002, message: '数据格式不正确' },
      OUT_OF_RANGE: { code: 4003, message: '数据超出允许范围' },
      INVALID_PARAMETER: { code: 4004, message: '参数无效' }
    }
  }
  
  /**
   * 创建业务错误
   */
  static createBusinessError(errorType, customMessage = null) {
    const error = this.ERROR_CODES.BUSINESS_ERROR[errorType]
    if (!error) {
      throw new Error(`未知的业务错误类型: ${errorType}`)
    }
    
    return {
      success: false,
      code: error.code,
      message: customMessage || error.message,
      type: 'BUSINESS_ERROR'
    }
  }
  
  /**
   * 创建系统错误
   */
  static createSystemError(errorType, customMessage = null, originalError = null) {
    const error = this.ERROR_CODES.SYSTEM_ERROR[errorType]
    if (!error) {
      throw new Error(`未知的系统错误类型: ${errorType}`)
    }
    
    // 记录原始错误信息
    if (originalError) {
      console.error(`系统错误 [${error.code}]:`, originalError)
    }
    
    return {
      success: false,
      code: error.code,
      message: customMessage || error.message,
      type: 'SYSTEM_ERROR',
      originalError: originalError ? originalError.message : null
    }
  }
  
  /**
   * 创建权限错误
   */
  static createAuthError(errorType, customMessage = null) {
    const error = this.ERROR_CODES.AUTH_ERROR[errorType]
    if (!error) {
      throw new Error(`未知的权限错误类型: ${errorType}`)
    }
    
    return {
      success: false,
      code: error.code,
      message: customMessage || error.message,
      type: 'AUTH_ERROR'
    }
  }
  
  /**
   * 创建验证错误
   */
  static createValidationError(errorType, customMessage = null, field = null) {
    const error = this.ERROR_CODES.VALIDATION_ERROR[errorType]
    if (!error) {
      throw new Error(`未知的验证错误类型: ${errorType}`)
    }
    
    return {
      success: false,
      code: error.code,
      message: customMessage || error.message,
      type: 'VALIDATION_ERROR',
      field: field
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
  
  /**
   * 处理云函数错误
   */
  static handleCloudFunctionError(error) {
    console.error('云函数错误:', error)
    
    // 网络错误
    if (error.errMsg && error.errMsg.includes('network')) {
      return this.createSystemError('NETWORK_ERROR')
    }
    
    // 云函数执行错误
    if (error.errMsg && error.errMsg.includes('cloud.callFunction')) {
      return this.createSystemError('CLOUD_FUNCTION_ERROR', null, error)
    }
    
    // 权限错误
    if (error.errMsg && error.errMsg.includes('permission')) {
      return this.createAuthError('FORBIDDEN')
    }
    
    // 默认系统错误
    return this.createSystemError('API_ERROR', error.errMsg || '未知错误', error)
  }
  
  /**
   * 处理数据库错误
   */
  static handleDatabaseError(error) {
    console.error('数据库错误:', error)
    
    // 重复键错误
    if (error.message && error.message.includes('duplicate key')) {
      return this.createBusinessError('DUPLICATE_EMPLOYEE_ID')
    }
    
    // 权限错误
    if (error.message && error.message.includes('permission')) {
      return this.createAuthError('FORBIDDEN')
    }
    
    // 默认数据库错误
    return this.createSystemError('DATABASE_ERROR', null, error)
  }
  
  /**
   * 处理百度API错误
   */
  static handleBaiduApiError(error) {
    console.error('百度API错误:', error)
    
    // 根据百度API的错误码进行处理
    if (error.code) {
      switch (error.code) {
        case 'InvalidAccessKey':
          return this.createSystemError('CONFIG_ERROR', '百度API密钥配置错误')
        case 'RequestLimitExceeded':
          return this.createSystemError('BAIDU_API_ERROR', '请求频率超限')
        case 'InsufficientBalance':
          return this.createSystemError('BAIDU_API_ERROR', '账户余额不足')
        default:
          return this.createSystemError('BAIDU_API_ERROR', error.message || '百度API调用失败')
      }
    }
    
    return this.createSystemError('BAIDU_API_ERROR', null, error)
  }
  
  /**
   * 统一错误日志记录
   */
  static logError(error, context = {}) {
    const logData = {
      timestamp: new Date().toISOString(),
      error: {
        code: error.code,
        message: error.message,
        type: error.type,
        stack: error.stack
      },
      context: context
    }
    
    console.error('错误日志:', JSON.stringify(logData, null, 2))
    
    // 在生产环境中，这里可以发送到日志服务
    // 例如：发送到微信云开发的日志服务或第三方日志平台
  }
  
  /**
   * 显示用户友好的错误信息
   */
  static showUserFriendlyError(error) {
    let title = '操作失败'
    let message = error.message || '未知错误'
    
    // 根据错误类型显示不同的标题
    switch (error.type) {
      case 'BUSINESS_ERROR':
        title = '操作提示'
        break
      case 'SYSTEM_ERROR':
        title = '系统错误'
        message = '系统暂时不可用，请稍后重试'
        break
      case 'AUTH_ERROR':
        title = '权限错误'
        break
      case 'VALIDATION_ERROR':
        title = '输入错误'
        break
    }
    
    wx.showModal({
      title: title,
      content: message,
      showCancel: false,
      confirmText: '确定'
    })
  }
  
  /**
   * 显示简单的错误提示
   */
  static showSimpleError(error) {
    wx.showToast({
      title: error.message || '操作失败',
      icon: 'error',
      duration: 2000
    })
  }
}

module.exports = ErrorHandler