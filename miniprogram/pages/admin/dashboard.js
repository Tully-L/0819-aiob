// pages/admin/dashboard.js
const Permission = require('../../utils/permission')

Page({
  data: {
    todayStats: {
      totalDrivers: 0,
      checkedIn: 0,
      notCheckedIn: 0,
      lateDrivers: 0
    },
    uncheckedDrivers: [],
    userInfo: null
  },

  onLoad() {
    // 检查管理员权限
    if (!Permission.checkPagePermission('view_dashboard')) {
      return
    }
    
    // 记录访问日志
    Permission.logOperation('访问管理后台', { page: 'dashboard' })
    
    // 获取用户信息
    this.setData({
      userInfo: Permission.getCurrentUserInfo()
    })
    
    this.getTodayStats()
  },

  async getTodayStats() {
    try {
      wx.showLoading({ title: '加载中...' })
      
      const result = await wx.cloud.callFunction({
        name: 'admin',
        data: {
          action: 'getTodayStats'
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        this.setData({
          todayStats: result.result.data.stats,
          uncheckedDrivers: result.result.data.uncheckedDrivers
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('获取统计数据失败:', error)
      
      // 如果云函数调用失败，使用模拟数据
      if (error.errMsg && error.errMsg.includes('cloud.callFunction:fail')) {
        console.log('云函数未部署，使用模拟数据')
        this.mockGetTodayStats()
      }
    }
  },

  // 模拟获取今日统计
  mockGetTodayStats() {
    const mockStats = {
      totalDrivers: 50,
      checkedIn: 42,
      notCheckedIn: 8,
      lateDrivers: 5
    }
    
    const mockUncheckedDrivers = [
      { _id: '1', name: '张三', employeeId: 'D001', phone: '138****1234' },
      { _id: '2', name: '李四', employeeId: 'D002', phone: '139****5678' },
      { _id: '3', name: '王五', employeeId: 'D003', phone: '137****9012' }
    ]
    
    this.setData({
      todayStats: mockStats,
      uncheckedDrivers: mockUncheckedDrivers
    })
  },

  goToDrivers() {
    wx.navigateTo({
      url: '/pages/admin/drivers'
    })
  },

  goToCalls() {
    wx.navigateTo({
      url: '/pages/admin/calls'
    })
  },

  goToSettings() {
    wx.navigateTo({
      url: '/pages/admin/settings'
    })
  }
})