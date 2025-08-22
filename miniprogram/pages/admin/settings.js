// pages/admin/settings.js
const Permission = require('../../utils/permission')

Page({
  data: {
    checkinConfig: {
      startTime: '08:00',
      endTime: '08:30',
      lateThreshold: 30
    }
  },

  onLoad() {
    // 检查管理员权限
    if (!Permission.checkPagePermission('system_settings')) {
      return
    }
    
    // 记录访问日志
    Permission.logOperation('访问系统设置', { page: 'settings' })
    
    this.getSystemConfig()
  },

  async getSystemConfig() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'admin',
        data: {
          action: 'getSystemConfig'
        }
      })

      if (result.result.success) {
        this.setData({
          checkinConfig: result.result.data.checkin_time || this.data.checkinConfig
        })
      }
    } catch (error) {
      console.error('获取系统配置失败:', error)
      
      // 如果云函数调用失败，使用默认配置
      if (error.errMsg && error.errMsg.includes('cloud.callFunction:fail')) {
        console.log('云函数未部署，使用默认配置')
        // 保持当前默认配置
      }
    }
  },

  // 表单处理函数
  onStartTimeChange(e) {
    this.setData({
      'checkinConfig.startTime': e.detail.value
    })
  },

  onEndTimeChange(e) {
    this.setData({
      'checkinConfig.endTime': e.detail.value
    })
  },

  onLateThresholdChange(e) {
    this.setData({
      'checkinConfig.lateThreshold': parseInt(e.detail.value) || 30
    })
  },

  async saveConfig() {
    try {
      wx.showLoading({ title: '保存中...' })
      
      const result = await wx.cloud.callFunction({
        name: 'admin',
        data: {
          action: 'updateSystemConfig',
          data: {
            configKey: 'checkin_time',
            configValue: this.data.checkinConfig
          }
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        // 记录操作日志
        Permission.logOperation('更新系统配置', {
          config: this.data.checkinConfig
        })
        
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: result.result.message || '保存失败',
          icon: 'error'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('保存配置失败:', error)
      
      // 如果云函数调用失败，使用模拟保存
      if (error.errMsg && error.errMsg.includes('cloud.callFunction:fail')) {
        console.log('云函数未部署，使用模拟保存')
        this.mockSaveConfig()
      } else {
        wx.showToast({
          title: '保存失败',
          icon: 'error'
        })
      }
    }
  },

  // 模拟保存配置
  mockSaveConfig() {
    // 保存到本地存储
    wx.setStorageSync('system_config_checkin_time', this.data.checkinConfig)
    
    wx.showToast({
      title: '保存成功（模拟）',
      icon: 'success'
    })
  }
})