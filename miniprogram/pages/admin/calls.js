// pages/admin/calls.js
const Permission = require('../../utils/permission')

Page({
  data: {
    callRecords: []
  },

  onLoad() {
    // 检查管理员权限
    if (!Permission.checkPagePermission('manage_calls')) {
      return
    }
    
    // 记录访问日志
    Permission.logOperation('访问外呼记录', { page: 'calls' })
    
    this.getCallRecords()
  },

  async getCallRecords() {
    try {
      wx.showLoading({ title: '加载中...' })
      
      const result = await wx.cloud.callFunction({
        name: 'admin',
        data: {
          action: 'getCallRecords',
          data: {
            page: 1,
            limit: 50
          }
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        this.setData({
          callRecords: result.result.data
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('获取外呼记录失败:', error)
      
      // 如果云函数调用失败，使用模拟数据
      if (error.errMsg && error.errMsg.includes('cloud.callFunction:fail')) {
        console.log('云函数未部署，使用模拟数据')
        this.mockGetCallRecords()
      }
    }
  },

  // 模拟获取外呼记录
  mockGetCallRecords() {
    const mockCallRecords = [
      {
        _id: '1',
        driverName: '张三',
        phone: '138****1234',
        callTime: '2024-01-20 09:15:30',
        status: 'completed',
        result: 'confirmed',
        duration: 45
      },
      {
        _id: '2',
        driverName: '李四',
        phone: '139****5678',
        callTime: '2024-01-20 09:20:15',
        status: 'completed',
        result: 'no_answer',
        duration: 0
      },
      {
        _id: '3',
        driverName: '王五',
        phone: '137****9012',
        callTime: '2024-01-20 09:25:45',
        status: 'failed',
        result: 'failed',
        duration: 0
      },
      {
        _id: '4',
        driverName: '赵六',
        phone: '136****3456',
        callTime: '2024-01-19 09:10:20',
        status: 'completed',
        result: 'confirmed',
        duration: 32
      }
    ]
    
    this.setData({
      callRecords: mockCallRecords
    })
  }
})