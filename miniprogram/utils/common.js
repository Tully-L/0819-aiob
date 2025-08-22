// utils/common.js

/**
 * 通用工具函数
 */

/**
 * 格式化日期
 */
function formatDate(date, format = 'YYYY-MM-DD') {
  if (!date) return ''
  
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  const second = String(d.getSeconds()).padStart(2, '0')
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second)
}

/**
 * 格式化时间
 */
function formatTime(date) {
  return formatDate(date, 'HH:mm:ss')
}

/**
 * 获取今日日期字符串
 */
function getTodayString() {
  return formatDate(new Date(), 'YYYY-MM-DD')
}

/**
 * 获取当前时间字符串
 */
function getCurrentTimeString() {
  return formatDate(new Date(), 'HH:mm:ss')
}

/**
 * 判断是否为今天
 */
function isToday(date) {
  const today = new Date()
  const targetDate = new Date(date)
  
  return today.getFullYear() === targetDate.getFullYear() &&
         today.getMonth() === targetDate.getMonth() &&
         today.getDate() === targetDate.getDate()
}

/**
 * 计算时间差（分钟）
 */
function getTimeDifferenceInMinutes(startTime, endTime) {
  const start = new Date(startTime)
  const end = new Date(endTime)
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0
  }
  
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60))
}

/**
 * 判断时间是否在范围内
 */
function isTimeInRange(currentTime, startTime, endTime) {
  const current = timeStringToMinutes(currentTime)
  const start = timeStringToMinutes(startTime)
  const end = timeStringToMinutes(endTime)
  
  return current >= start && current <= end
}

/**
 * 时间字符串转换为分钟数
 */
function timeStringToMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * 分钟数转换为时间字符串
 */
function minutesToTimeString(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/**
 * 生成唯一ID
 */
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

/**
 * 深拷贝对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime())
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item))
  }
  
  if (typeof obj === 'object') {
    const cloned = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key])
      }
    }
    return cloned
  }
  
  return obj
}

/**
 * 防抖函数
 */
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * 节流函数
 */
function throttle(func, limit) {
  let inThrottle
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * 简单的加密函数（用于敏感信息）
 */
function simpleEncrypt(text, key = 'fleet-management') {
  if (!text) return ''
  
  let result = ''
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    result += String.fromCharCode(charCode)
  }
  
  return btoa(result) // Base64编码
}

/**
 * 简单的解密函数
 */
function simpleDecrypt(encryptedText, key = 'fleet-management') {
  if (!encryptedText) return ''
  
  try {
    const text = atob(encryptedText) // Base64解码
    let result = ''
    
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      result += String.fromCharCode(charCode)
    }
    
    return result
  } catch (error) {
    console.error('解密失败:', error)
    return ''
  }
}

/**
 * 手机号脱敏
 */
function maskPhone(phone) {
  if (!phone || phone.length !== 11) return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

/**
 * 获取文件扩展名
 */
function getFileExtension(filename) {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 检查是否为空值
 */
function isEmpty(value) {
  return value === null || 
         value === undefined || 
         value === '' || 
         (Array.isArray(value) && value.length === 0) ||
         (typeof value === 'object' && Object.keys(value).length === 0)
}

/**
 * 获取打卡状态文本
 */
function getCheckinStatusText(status) {
  const statusMap = {
    'normal': '正常',
    'late': '迟到',
    'missed': '缺勤'
  }
  return statusMap[status] || '未知'
}

/**
 * 获取外呼状态文本
 */
function getCallStatusText(status) {
  const statusMap = {
    'pending': '进行中',
    'completed': '已完成',
    'failed': '失败'
  }
  return statusMap[status] || '未知'
}

/**
 * 获取外呼结果文本
 */
function getCallResultText(result) {
  const resultMap = {
    'confirmed': '已确认',
    'no_answer': '无人接听',
    'busy': '忙线',
    'failed': '失败'
  }
  return resultMap[result] || '未知'
}

module.exports = {
  formatDate,
  formatTime,
  getTodayString,
  getCurrentTimeString,
  isToday,
  getTimeDifferenceInMinutes,
  isTimeInRange,
  timeStringToMinutes,
  minutesToTimeString,
  generateUniqueId,
  deepClone,
  debounce,
  throttle,
  simpleEncrypt,
  simpleDecrypt,
  maskPhone,
  getFileExtension,
  formatFileSize,
  isEmpty,
  getCheckinStatusText,
  getCallStatusText,
  getCallResultText
}