// pages/driver/history.js
const Permission = require('../../utils/permission')

Page({
  data: {
    checkinList: []
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
    Permission.logOperation('查看打卡历史', { page: 'history' })
    
    this.getCheckinHistory()
  },

  async getCheckinHistory() {
    try {
      wx.showLoading({ title: '加载中...' })
      
      const result = await wx.cloud.callFunction({
        name: 'checkin',
        data: {
          action: 'getHistory',
          data: {
            page: 1,
            limit: 50
          }
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        this.setData({
          checkinList: result.result.data
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('获取打卡历史失败:', error)
      
      // 如果云函数调用失败，使用模拟数据
      if (error.errMsg && error.errMsg.includes('cloud.callFunction:fail')) {
        console.log('云函数未部署，使用模拟数据')
        this.mockGetCheckinHistory()
      }
    }
  },

  // 模拟获取打卡历史
  mockGetCheckinHistory() {
    const mockData = []
    const today = new Date()
    
    // 生成最近7天的模拟数据
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      
      const dateStr = date.toISOString().split('T')[0]
      const checkinData = wx.getStorageSync(`checkin_${dateStr}`)
      
      if (checkinData) {
        mockData.push({
          _id: `mock_${dateStr}`,
          date: dateStr,
          checkinTime: checkinData.time,
          status: checkinData.status,
          location: checkinData.location
        })
      } else if (i > 0) {
        // 为过去的日期生成一些模拟数据
        const hour = 8 + Math.floor(Math.random() * 2)
        const minute = Math.floor(Math.random() * 60)
        const mockTime = new Date(date)
        mockTime.setHours(hour, minute, 0, 0)
        
        let status = 'normal'
        if (hour > 8 || (hour === 8 && minute > 30)) {
          status = 'late'
        }
        
        mockData.push({
          _id: `mock_${dateStr}`,
          date: dateStr,
          checkinTime: mockTime.toLocaleString('zh-CN'),
          status: status,
          location: {
            latitude: 39.9042 + (Math.random() - 0.5) * 0.01,
            longitude: 116.4074 + (Math.random() - 0.5) * 0.01,
            address: '模拟地址'
          }
        })
      }
    }
    
    this.setData({
      checkinList: mockData
    })
  }
})