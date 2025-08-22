// pages/auth/register.js
Page({
  data: {
    tempUserInfo: null,
    formData: {
      name: '',
      employeeId: '',
      phone: ''
    },
    isSubmitting: false
  },

  onLoad() {
    // 获取临时用户信息
    const tempUserInfo = wx.getStorageSync('tempUserInfo')
    if (tempUserInfo) {
      this.setData({
        tempUserInfo: tempUserInfo,
        'formData.name': tempUserInfo.nickName || ''
      })
    } else {
      // 如果没有临时用户信息，返回登录页
      wx.redirectTo({
        url: '/pages/auth/login'
      })
    }
  },

  // 输入框事件处理
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    })
  },

  onEmployeeIdInput(e) {
    this.setData({
      'formData.employeeId': e.detail.value
    })
  },

  onPhoneInput(e) {
    this.setData({
      'formData.phone': e.detail.value
    })
  },

  // 表单验证
  validateForm() {
    const { name, employeeId, phone } = this.data.formData
    
    if (!name.trim()) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'error'
      })
      return false
    }

    if (!employeeId.trim()) {
      wx.showToast({
        title: '请输入工号',
        icon: 'error'
      })
      return false
    }

    // 验证工号格式
    const employeeIdRegex = /^[A-Za-z0-9]{3,20}$/
    if (!employeeIdRegex.test(employeeId)) {
      wx.showToast({
        title: '工号格式不正确',
        icon: 'error'
      })
      return false
    }

    if (!phone.trim()) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'error'
      })
      return false
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(phone)) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'error'
      })
      return false
    }

    return true
  },

  // 提交注册
  async submitRegister() {
    if (this.data.isSubmitting) return

    if (!this.validateForm()) return

    this.setData({ isSubmitting: true })

    try {
      wx.showLoading({
        title: '注册中...',
      })

      const driverInfo = {
        ...this.data.formData,
        avatarUrl: this.data.tempUserInfo.avatarUrl,
        nickName: this.data.tempUserInfo.nickName
      }

      const result = await wx.cloud.callFunction({
        name: 'auth',
        data: {
          action: 'register',
          driverInfo: driverInfo
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        const user = result.result.data.user
        
        // 保存用户信息
        wx.setStorageSync('userInfo', user)
        wx.setStorageSync('userRole', user.role)
        
        // 清除临时用户信息
        wx.removeStorageSync('tempUserInfo')

        wx.showToast({
          title: '注册成功',
          icon: 'success'
        })

        // 跳转到对应页面
        setTimeout(() => {
          if (user.role === 'admin') {
            wx.redirectTo({
              url: '/pages/admin/dashboard'
            })
          } else {
            wx.redirectTo({
              url: '/pages/driver/checkin'
            })
          }
        }, 1500)

      } else {
        wx.showToast({
          title: result.result.message || '注册失败',
          icon: 'error'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('注册失败:', error)
      
      // 如果云函数还未部署，使用模拟注册
      if (error.errMsg && error.errMsg.includes('cloud.callFunction:fail')) {
        console.log('云函数未部署，使用模拟注册')
        this.mockRegister()
      } else {
        wx.showToast({
          title: '注册失败',
          icon: 'error'
        })
      }
    } finally {
      this.setData({ isSubmitting: false })
    }
  },

  // 模拟注册（用于开发测试）
  mockRegister() {
    wx.showLoading({
      title: '模拟注册中...',
    })
    
    setTimeout(() => {
      wx.hideLoading()
      
      const mockUser = {
        _id: 'mock_' + Date.now(),
        name: this.data.formData.name,
        employeeId: this.data.formData.employeeId,
        phone: this.data.formData.phone,
        role: 'driver',
        status: 'active',
        avatarUrl: this.data.tempUserInfo.avatarUrl,
        nickName: this.data.tempUserInfo.nickName,
        createdAt: new Date()
      }
      
      // 保存用户信息
      wx.setStorageSync('userInfo', mockUser)
      wx.setStorageSync('userRole', mockUser.role)
      
      // 清除临时用户信息
      wx.removeStorageSync('tempUserInfo')

      wx.showToast({
        title: '注册成功',
        icon: 'success'
      })

      setTimeout(() => {
        wx.redirectTo({
          url: '/pages/driver/checkin'
        })
      }, 1500)
    }, 1000)
  },

  // 返回登录页
  goBack() {
    wx.redirectTo({
      url: '/pages/auth/login'
    })
  }
})