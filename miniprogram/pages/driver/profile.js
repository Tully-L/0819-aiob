// pages/driver/profile.js
const Permission = require('../../utils/permission')

Page({
  data: {
    userInfo: null,
    driverInfo: null
  },

  onLoad() {
    // 检查登录状态
    if (!Permission.checkLogin()) {
      wx.redirectTo({
        url: '/pages/auth/login'
      })
      return
    }
    
    // 记录访问日志
    Permission.logOperation('查看个人信息', { page: 'profile' })
    
    this.getUserInfo()
  },

  async getUserInfo() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'auth',
        data: {
          action: 'getUserInfo'
        }
      })

      if (result.result.success) {
        this.setData({
          driverInfo: result.result.data
        })
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
      
      // 如果云函数调用失败，使用本地存储的用户信息
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo) {
        this.setData({
          driverInfo: userInfo
        })
      }
    }
  },

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 记录退出日志
          Permission.logOperation('用户退出登录', { page: 'profile' })
          
          // 清除用户信息
          Permission.clearUserInfo()
          
          wx.redirectTo({
            url: '/pages/auth/login'
          })
        }
      }
    })
  }
})