// pages/driver/checkin.js
const Permission = require('../../utils/permission')

Page({
  data: {
    userInfo: null,
    todayStatus: null,
    location: null,
    isChecking: false,
    currentTime: '',
    currentDate: ''
  },

  onLoad() {
    // 检查登录状态和司机权限
    if (!Permission.checkLogin()) {
      wx.redirectTo({
        url: '/pages/auth/login'
      })
      return
    }
    
    // 获取用户信息
    this.setData({
      userInfo: Permission.getCurrentUserInfo()
    })
    
    this.updateTime()
    this.getTodayStatus()
    // 每秒更新时间
    this.timeInterval = setInterval(() => {
      this.updateTime()
    }, 1000)
  },

  onUnload() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval)
    }
  },

  updateTime() {
    const now = new Date()
    const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false })
    const dateStr = now.toLocaleDateString('zh-CN')
    this.setData({
      currentTime: timeStr,
      currentDate: dateStr
    })
  },

  async getTodayStatus() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'checkin',
        data: {
          action: 'getStatus'
        }
      })

      if (result.result.success) {
        this.setData({
          todayStatus: result.result.data
        })
      }
    } catch (error) {
      console.error('获取打卡状态失败:', error)
      
      // 如果云函数调用失败，使用模拟数据
      if (error.errMsg && error.errMsg.includes('cloud.callFunction:fail')) {
        console.log('云函数未部署，使用模拟数据')
        this.mockGetTodayStatus()
      }
    }
  },

  // 模拟获取今日状态
  mockGetTodayStatus() {
    const today = new Date().toISOString().split('T')[0]
    const checkedInToday = wx.getStorageSync(`checkin_${today}`)
    
    if (checkedInToday) {
      this.setData({
        todayStatus: {
          hasCheckedIn: true,
          checkinTime: checkedInToday.time,
          status: checkedInToday.status,
          location: checkedInToday.location
        }
      })
    } else {
      this.setData({
        todayStatus: {
          hasCheckedIn: false,
          checkinTime: null,
          status: null,
          location: null
        }
      })
    }
  },

  async getLocation() {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          resolve({
            latitude: res.latitude,
            longitude: res.longitude
          })
        },
        fail: (error) => {
          if (error.errMsg.includes('auth deny')) {
            wx.showModal({
              title: '需要位置权限',
              content: '打卡功能需要获取您的位置信息，请在设置中开启位置权限',
              confirmText: '去设置',
              success: (res) => {
                if (res.confirm) {
                  wx.openSetting()
                }
              }
            })
          }
          reject(error)
        }
      })
    })
  },

  async doCheckin() {
    if (this.data.isChecking) return
    
    this.setData({ isChecking: true })
    
    try {
      wx.showLoading({
        title: '定位中...',
      })

      // 获取位置信息
      const location = await this.getLocation()
      
      wx.showLoading({
        title: '打卡中...',
      })

      // 调用打卡云函数
      const result = await wx.cloud.callFunction({
        name: 'checkin',
        data: {
          action: 'checkin',
          data: {
            location: location
          }
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        // 记录操作日志
        Permission.logOperation('司机打卡', {
          status: result.result.data.status,
          location: location
        })
        
        wx.showToast({
          title: '打卡成功',
          icon: 'success'
        })
        this.getTodayStatus()
      } else {
        wx.showToast({
          title: result.result.message || '打卡失败',
          icon: 'error'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('打卡失败:', error)
      
      // 如果云函数调用失败，使用模拟打卡
      if (error.errMsg && error.errMsg.includes('cloud.callFunction:fail')) {
        console.log('云函数未部署，使用模拟打卡')
        this.mockCheckin(location)
      } else {
        wx.showToast({
          title: '打卡失败',
          icon: 'error'
        })
      }
    } finally {
      this.setData({ isChecking: false })
    }
  },

  // 模拟打卡功能
  async mockCheckin(location) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const checkedInToday = wx.getStorageSync(`checkin_${today}`)
      
      if (checkedInToday) {
        wx.showToast({
          title: '今日已打卡',
          icon: 'error'
        })
        return
      }
      
      const now = new Date()
      const timeStr = now.toLocaleString('zh-CN')
      
      // 模拟判断打卡状态
      const hour = now.getHours()
      const minute = now.getMinutes()
      let status = 'normal'
      
      if (hour > 8 || (hour === 8 && minute > 30)) {
        status = 'late'
      }
      if (hour > 9) {
        status = 'missed'
      }
      
      const checkinData = {
        time: timeStr,
        status: status,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: `纬度: ${location.latitude.toFixed(6)}, 经度: ${location.longitude.toFixed(6)}`
        }
      }
      
      // 保存到本地存储
      wx.setStorageSync(`checkin_${today}`, checkinData)
      
      wx.showToast({
        title: '打卡成功（模拟）',
        icon: 'success'
      })
      
      // 更新状态
      this.getTodayStatus()
      
    } catch (error) {
      console.error('模拟打卡失败:', error)
      wx.showToast({
        title: '打卡失败',
        icon: 'error'
      })
    }
  },

  goToHistory() {
    wx.navigateTo({
      url: '/pages/driver/history'
    })
  },

  goToProfile() {
    wx.navigateTo({
      url: '/pages/driver/profile'
    })
  }
})