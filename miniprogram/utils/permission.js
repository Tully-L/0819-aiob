// utils/permission.js

/**
 * 权限管理工具类
 */
class Permission {
  
  /**
   * 检查用户是否已登录
   */
  static checkLogin() {
    const userInfo = wx.getStorageSync('userInfo')
    const userRole = wx.getStorageSync('userRole')
    
    return !!(userInfo && userRole)
  }
  
  /**
   * 获取当前用户角色
   */
  static getCurrentUserRole() {
    return wx.getStorageSync('userRole') || null
  }
  
  /**
   * 获取当前用户信息
   */
  static getCurrentUserInfo() {
    return wx.getStorageSync('userInfo') || null
  }
  
  /**
   * 检查是否为管理员
   */
  static isAdmin() {
    const userRole = this.getCurrentUserRole()
    return userRole === 'admin'
  }
  
  /**
   * 检查是否为司机
   */
  static isDriver() {
    const userRole = this.getCurrentUserRole()
    return userRole === 'driver'
  }
  
  /**
   * 检查用户是否有指定权限
   */
  static hasPermission(permission) {
    const userRole = this.getCurrentUserRole()
    
    if (!userRole) return false
    
    // 管理员拥有所有权限
    if (userRole === 'admin') return true
    
    // 根据权限类型检查
    const permissions = {
      // 司机权限
      'checkin': ['driver', 'admin'],
      'view_own_profile': ['driver', 'admin'],
      'view_own_history': ['driver', 'admin'],
      
      // 管理员权限
      'view_dashboard': ['admin'],
      'manage_drivers': ['admin'],
      'view_all_checkins': ['admin'],
      'manage_calls': ['admin'],
      'system_settings': ['admin'],
      'export_data': ['admin']
    }
    
    const allowedRoles = permissions[permission] || []
    return allowedRoles.includes(userRole)
  }
  
  /**
   * 权限检查装饰器（用于页面）
   */
  static requirePermission(permission, redirectUrl = '/pages/auth/login') {
    return function(target, propertyKey, descriptor) {
      const originalMethod = descriptor.value
      
      descriptor.value = function(...args) {
        if (!Permission.hasPermission(permission)) {
          wx.showModal({
            title: '权限不足',
            content: '您没有访问此功能的权限',
            showCancel: false,
            success: () => {
              wx.redirectTo({
                url: redirectUrl
              })
            }
          })
          return
        }
        
        return originalMethod.apply(this, args)
      }
      
      return descriptor
    }
  }
  
  /**
   * 登录检查装饰器
   */
  static requireLogin(redirectUrl = '/pages/auth/login') {
    return function(target, propertyKey, descriptor) {
      const originalMethod = descriptor.value
      
      descriptor.value = function(...args) {
        if (!Permission.checkLogin()) {
          wx.redirectTo({
            url: redirectUrl
          })
          return
        }
        
        return originalMethod.apply(this, args)
      }
      
      return descriptor
    }
  }
  
  /**
   * 页面权限检查中间件
   */
  static checkPagePermission(permission, showError = true) {
    if (!this.checkLogin()) {
      wx.redirectTo({
        url: '/pages/auth/login'
      })
      return false
    }
    
    if (!this.hasPermission(permission)) {
      if (showError) {
        wx.showModal({
          title: '权限不足',
          content: '您没有访问此页面的权限',
          showCancel: false,
          success: () => {
            // 根据用户角色跳转到对应页面
            const userRole = this.getCurrentUserRole()
            if (userRole === 'admin') {
              wx.redirectTo({
                url: '/pages/admin/dashboard'
              })
            } else if (userRole === 'driver') {
              wx.redirectTo({
                url: '/pages/driver/checkin'
              })
            } else {
              wx.redirectTo({
                url: '/pages/auth/login'
              })
            }
          }
        })
      }
      return false
    }
    
    return true
  }
  
  /**
   * 清除用户信息（退出登录）
   */
  static clearUserInfo() {
    wx.removeStorageSync('userInfo')
    wx.removeStorageSync('userRole')
  }
  
  /**
   * 记录操作日志
   */
  static async logOperation(operation, details = {}) {
    const userInfo = this.getCurrentUserInfo()
    if (!userInfo) return
    
    const logData = {
      userId: userInfo._id,
      userName: userInfo.name,
      userRole: userInfo.role,
      operation: operation,
      details: details,
      timestamp: new Date().toISOString(),
      page: getCurrentPages().pop()?.route || 'unknown'
    }
    
    console.log('操作日志:', logData)
    
    // 这里可以调用云函数记录日志
    try {
      await wx.cloud.callFunction({
        name: 'admin',
        data: {
          action: 'logOperation',
          logData: logData
        }
      })
    } catch (error) {
      console.error('记录操作日志失败:', error)
    }
  }
  
  /**
   * 获取用户菜单权限
   */
  static getUserMenus() {
    const userRole = this.getCurrentUserRole()
    
    const menus = {
      driver: [
        { name: '打卡', url: '/pages/driver/checkin', icon: '📍' },
        { name: '个人信息', url: '/pages/driver/profile', icon: '👤' },
        { name: '打卡历史', url: '/pages/driver/history', icon: '📋' }
      ],
      admin: [
        { name: '数据看板', url: '/pages/admin/dashboard', icon: '📊' },
        { name: '司机管理', url: '/pages/admin/drivers', icon: '👥' },
        { name: '外呼记录', url: '/pages/admin/calls', icon: '📞' },
        { name: '系统设置', url: '/pages/admin/settings', icon: '⚙️' }
      ]
    }
    
    return menus[userRole] || []
  }
  
  /**
   * 检查功能是否可用
   */
  static isFeatureEnabled(feature) {
    const userRole = this.getCurrentUserRole()
    
    const features = {
      // 司机功能
      'checkin_button': ['driver', 'admin'],
      'view_history': ['driver', 'admin'],
      'edit_profile': ['driver', 'admin'],
      
      // 管理员功能
      'add_driver': ['admin'],
      'edit_driver': ['admin'],
      'delete_driver': ['admin'],
      'make_call': ['admin'],
      'export_data': ['admin'],
      'system_config': ['admin']
    }
    
    const allowedRoles = features[feature] || []
    return allowedRoles.includes(userRole)
  }
}

module.exports = Permission