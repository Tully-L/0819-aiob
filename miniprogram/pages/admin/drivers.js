// pages/admin/drivers.js
const Permission = require('../../utils/permission')

Page({
  data: {
    driverList: []
  },

  onLoad() {
    // 检查管理员权限
    if (!Permission.checkPagePermission('manage_drivers')) {
      return
    }
    
    // 记录访问日志
    Permission.logOperation('访问司机管理', { page: 'drivers' })
    
    this.getDriverList()
  },

  async getDriverList() {
    try {
      wx.showLoading({ title: '加载中...' })
      
      const result = await wx.cloud.callFunction({
        name: 'admin',
        data: {
          action: 'getDriverList',
          data: {
            page: 1,
            limit: 50
          }
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        this.setData({
          driverList: result.result.data
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('获取司机列表失败:', error)
      
      // 如果云函数调用失败，使用模拟数据
      if (error.errMsg && error.errMsg.includes('cloud.callFunction:fail')) {
        console.log('云函数未部署，使用模拟数据')
        this.mockGetDriverList()
      }
    }
  },

  // 模拟获取司机列表
  mockGetDriverList() {
    const mockDrivers = [
      { _id: '1', name: '张三', employeeId: 'D001', phone: '138****1234', status: 'active', createdAt: '2024-01-15' },
      { _id: '2', name: '李四', employeeId: 'D002', phone: '139****5678', status: 'active', createdAt: '2024-01-16' },
      { _id: '3', name: '王五', employeeId: 'D003', phone: '137****9012', status: 'active', createdAt: '2024-01-17' },
      { _id: '4', name: '赵六', employeeId: 'D004', phone: '136****3456', status: 'active', createdAt: '2024-01-18' },
      { _id: '5', name: '钱七', employeeId: 'D005', phone: '135****7890', status: 'inactive', createdAt: '2024-01-19' }
    ]
    
    this.setData({
      driverList: mockDrivers
    })
  }
})