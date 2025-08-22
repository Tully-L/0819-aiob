// utils/api.js

/**
 * 统一的云函数调用方法
 */
function callCloudFunction(name, data = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: name,
      data: data,
      success: (res) => {
        if (res.result && res.result.success) {
          resolve(res.result);
        } else {
          reject(new Error(res.result?.message || '调用失败'));
        }
      },
      fail: (error) => {
        console.error(`云函数 ${name} 调用失败:`, error);
        reject(error);
      }
    });
  });
}

/**
 * 身份验证相关API
 */
const authAPI = {
  // 检查用户角色
  checkRole: () => callCloudFunction('auth', { action: 'checkRole' }),
  
  // 用户登录
  login: (userInfo) => callCloudFunction('auth', { action: 'login', userInfo }),
  
  // 司机注册
  register: (driverInfo) => callCloudFunction('auth', { action: 'register', driverInfo }),
  
  // 获取用户信息
  getUserInfo: () => callCloudFunction('auth', { action: 'getUserInfo' })
};

/**
 * 打卡相关API
 */
const checkinAPI = {
  // 司机打卡
  checkin: (location) => callCloudFunction('checkin', { action: 'checkin', data: { location } }),
  
  // 获取今日打卡状态
  getTodayStatus: () => callCloudFunction('checkin', { action: 'getStatus' }),
  
  // 获取打卡历史
  getHistory: (params = {}) => callCloudFunction('checkin', { action: 'getHistory', data: params })
};

/**
 * 外呼相关API
 */
const callAPI = {
  // 发起外呼
  makeCall: (phone, driverId) => callCloudFunction('call', { action: 'makeCall', data: { phone, driverId } }),
  
  // 获取外呼记录
  getCallRecords: (params = {}) => callCloudFunction('call', { action: 'getCallRecords', data: params }),
  
  // 处理外呼回调
  handleCallback: (callbackData) => callCloudFunction('call', { action: 'handleCallback', data: callbackData })
};

/**
 * 管理员相关API
 */
const adminAPI = {
  // 获取今日统计
  getTodayStats: () => callCloudFunction('admin', { action: 'getTodayStats' }),
  
  // 获取司机列表
  getDriverList: (params = {}) => callCloudFunction('admin', { action: 'getDriverList', data: params }),
  
  // 获取外呼记录
  getCallRecords: (params = {}) => callCloudFunction('admin', { action: 'getCallRecords', data: params }),
  
  // 获取系统配置
  getSystemConfig: () => callCloudFunction('admin', { action: 'getSystemConfig' }),
  
  // 更新系统配置
  updateSystemConfig: (config) => callCloudFunction('admin', { action: 'updateSystemConfig', data: config }),
  
  // 导出数据
  exportData: (params = {}) => callCloudFunction('admin', { action: 'exportData', data: params })
};

/**
 * 错误处理
 */
function handleError(error, showToast = true) {
  console.error('API调用错误:', error);
  
  let message = '操作失败';
  if (error.message) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }
  
  if (showToast) {
    wx.showToast({
      title: message,
      icon: 'error',
      duration: 2000
    });
  }
  
  return message;
}

/**
 * 显示加载状态
 */
function showLoading(title = '加载中...') {
  wx.showLoading({
    title: title,
    mask: true
  });
}

/**
 * 隐藏加载状态
 */
function hideLoading() {
  wx.hideLoading();
}

module.exports = {
  callCloudFunction,
  authAPI,
  checkinAPI,
  callAPI,
  adminAPI,
  handleError,
  showLoading,
  hideLoading
};