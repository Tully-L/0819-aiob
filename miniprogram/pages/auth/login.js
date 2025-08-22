// pages/auth/login.js
Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    canIUseGetUserProfile: false,
  },

  onLoad() {
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }
  },

  getUserProfile(e) {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
        this.checkUserRole()
      }
    })
  },

  getUserInfo(e) {
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
    this.checkUserRole()
  },

  async checkUserRole() {
    try {
      wx.showLoading({
        title: '登录中...',
      })
      
      // 首先尝试登录
      const loginResult = await wx.cloud.callFunction({
        name: 'auth',
        data: {
          action: 'login',
          userInfo: this.data.userInfo
        }
      })

      wx.hideLoading()

      if (loginResult.result.success) {
        const { user, isNewUser } = loginResult.result.data
        
        if (isNewUser) {
          // 新用户，需要注册
          wx.setStorageSync('tempUserInfo', this.data.userInfo)
          wx.navigateTo({
            url: '/pages/auth/register'
          })
        } else {
          // 已存在用户，保存信息并跳转
          wx.setStorageSync('userInfo', user)
          wx.setStorageSync('userRole', user.role)
          
          if (user.role === 'admin') {
            wx.redirectTo({
              url: '/pages/admin/dashboard'
            })
          } else {
            wx.redirectTo({
              url: '/pages/driver/checkin'
            })
          }
        }
      } else {
        wx.showToast({
          title: loginResult.result.message || '登录失败',
          icon: 'error'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('登录失败:', error)
      
      // 如果云函数还未部署，使用模拟登录
      if (error.errMsg && error.errMsg.includes('cloud.callFunction:fail')) {
        console.log('云函数未部署，使用模拟登录')
        this.mockLogin()
      } else {
        wx.showToast({
          title: '登录失败',
          icon: 'error'
        })
      }
    }
  },

  // 模拟登录（用于开发测试）
  mockLogin() {
    wx.showLoading({
      title: '模拟登录中...',
    })
    
    setTimeout(() => {
      wx.hideLoading()
      
      // 保存用户信息到本地存储
      wx.setStorageSync('userInfo', this.data.userInfo)
      
      // 模拟角色判断 - 可以根据微信昵称或其他条件判断
      const isAdmin = this.data.userInfo.nickName.includes('管理') || 
                     this.data.userInfo.nickName.includes('admin') ||
                     this.data.userInfo.nickName.includes('Admin')
      
      if (isAdmin) {
        wx.setStorageSync('userRole', 'admin')
        wx.redirectTo({
          url: '/pages/admin/dashboard'
        })
      } else {
        wx.setStorageSync('userRole', 'driver')
        wx.redirectTo({
          url: '/pages/driver/checkin'
        })
      }
    }, 1000)
  }
})