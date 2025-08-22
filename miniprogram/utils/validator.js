// utils/validator.js

/**
 * 数据验证工具类
 */
class Validator {
  
  /**
   * 验证司机信息
   */
  static validateDriverInfo(driverInfo) {
    const errors = []
    
    if (!driverInfo.name || driverInfo.name.trim().length === 0) {
      errors.push('司机姓名不能为空')
    }
    
    if (!driverInfo.employeeId || driverInfo.employeeId.trim().length === 0) {
      errors.push('工号不能为空')
    }
    
    if (!this.validatePhone(driverInfo.phone)) {
      errors.push('手机号格式不正确')
    }
    
    if (driverInfo.role && !['driver', 'admin'].includes(driverInfo.role)) {
      errors.push('用户角色不正确')
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    }
  }
  
  /**
   * 验证打卡信息
   */
  static validateCheckinInfo(checkinInfo) {
    const errors = []
    
    if (!checkinInfo.location) {
      errors.push('位置信息不能为空')
    } else {
      if (!this.validateLatitude(checkinInfo.location.latitude)) {
        errors.push('纬度信息不正确')
      }
      
      if (!this.validateLongitude(checkinInfo.location.longitude)) {
        errors.push('经度信息不正确')
      }
    }
    
    if (checkinInfo.status && !['normal', 'late', 'missed'].includes(checkinInfo.status)) {
      errors.push('打卡状态不正确')
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    }
  }
  
  /**
   * 验证外呼记录信息
   */
  static validateCallRecord(callRecord) {
    const errors = []
    
    if (!callRecord.driverId || callRecord.driverId.trim().length === 0) {
      errors.push('司机ID不能为空')
    }
    
    if (!this.validatePhone(callRecord.phone)) {
      errors.push('外呼号码格式不正确')
    }
    
    if (callRecord.status && !['pending', 'completed', 'failed'].includes(callRecord.status)) {
      errors.push('外呼状态不正确')
    }
    
    if (callRecord.result && !['confirmed', 'no_answer', 'busy', 'failed'].includes(callRecord.result)) {
      errors.push('外呼结果不正确')
    }
    
    if (callRecord.duration && (typeof callRecord.duration !== 'number' || callRecord.duration < 0)) {
      errors.push('通话时长必须是非负数')
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    }
  }
  
  /**
   * 验证系统配置
   */
  static validateSystemConfig(config) {
    const errors = []
    
    if (!config.key || config.key.trim().length === 0) {
      errors.push('配置键不能为空')
    }
    
    if (config.value === undefined || config.value === null) {
      errors.push('配置值不能为空')
    }
    
    // 特定配置的验证
    if (config.key === 'checkin_time') {
      const value = config.value
      if (!value.startTime || !this.validateTime(value.startTime)) {
        errors.push('开始时间格式不正确')
      }
      
      if (!value.endTime || !this.validateTime(value.endTime)) {
        errors.push('结束时间格式不正确')
      }
      
      if (typeof value.lateThreshold !== 'number' || value.lateThreshold < 0) {
        errors.push('迟到阈值必须是非负数')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    }
  }
  
  /**
   * 验证外呼模板
   */
  static validateCallTemplate(template) {
    const errors = []
    
    if (!template.name || template.name.trim().length === 0) {
      errors.push('模板名称不能为空')
    }
    
    if (!template.templateId || template.templateId.trim().length === 0) {
      errors.push('模板ID不能为空')
    }
    
    if (!template.content || template.content.trim().length === 0) {
      errors.push('模板内容不能为空')
    }
    
    if (!Array.isArray(template.params)) {
      errors.push('模板参数必须是数组')
    }
    
    if (typeof template.isActive !== 'boolean') {
      errors.push('模板状态必须是布尔值')
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    }
  }
  
  /**
   * 验证手机号
   */
  static validatePhone(phone) {
    if (!phone) return false
    const phoneRegex = /^1[3-9]\d{9}$/
    return phoneRegex.test(phone)
  }
  
  /**
   * 验证邮箱
   */
  static validateEmail(email) {
    if (!email) return false
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
  
  /**
   * 验证时间格式 (HH:MM)
   */
  static validateTime(time) {
    if (!time) return false
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    return timeRegex.test(time)
  }
  
  /**
   * 验证纬度
   */
  static validateLatitude(lat) {
    return typeof lat === 'number' && lat >= -90 && lat <= 90
  }
  
  /**
   * 验证经度
   */
  static validateLongitude(lng) {
    return typeof lng === 'number' && lng >= -180 && lng <= 180
  }
  
  /**
   * 验证日期格式 (YYYY-MM-DD)
   */
  static validateDate(date) {
    if (!date) return false
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) return false
    
    const dateObj = new Date(date)
    return dateObj instanceof Date && !isNaN(dateObj)
  }
  
  /**
   * 验证工号格式
   */
  static validateEmployeeId(employeeId) {
    if (!employeeId) return false
    // 工号格式：字母+数字，长度3-20
    const employeeIdRegex = /^[A-Za-z0-9]{3,20}$/
    return employeeIdRegex.test(employeeId)
  }
  
  /**
   * 清理和格式化数据
   */
  static sanitizeData(data) {
    if (typeof data === 'string') {
      return data.trim()
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item))
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = {}
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          sanitized[key] = this.sanitizeData(data[key])
        }
      }
      return sanitized
    }
    
    return data
  }
}

module.exports = Validator