// utils/auth.js

/**
 * 检查用户登录状态
 */
function checkLoginStatus() {
  return new Promise((resolve, reject) => {
    wx.checkSession({
      success: () => {
        const userInfo = wx.getStorageSync('userInfo');
        if (userInfo) {
          resolve(userInfo);
        } else {
          reject(new Error('用户信息不存在'));
        }
      },
      fail: () => {
        reject(new Error('登录状态已过期'));
      }
    });
  });
}

/**
 * 用户登录
 */
function login() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res.code) {
          resolve(res.code);
        } else {
          reject(new Error('获取登录凭证失败'));
        }
      },
      fail: reject
    });
  });
}

/**
 * 获取用户信息
 */
function getUserInfo() {
  return new Promise((resolve, reject) => {
    wx.getUserInfo({
      success: resolve,
      fail: reject
    });
  });
}

/**
 * 保存用户信息到本地存储
 */
function saveUserInfo(userInfo) {
  wx.setStorageSync('userInfo', userInfo);
}

/**
 * 清除用户信息
 */
function clearUserInfo() {
  wx.removeStorageSync('userInfo');
}

module.exports = {
  checkLoginStatus,
  login,
  getUserInfo,
  saveUserInfo,
  clearUserInfo
};