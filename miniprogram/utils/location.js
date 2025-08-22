// utils/location.js

/**
 * 获取当前位置
 */
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02', // 返回可以用于wx.openLocation的经纬度
      success: (res) => {
        resolve({
          latitude: res.latitude,
          longitude: res.longitude,
          speed: res.speed,
          accuracy: res.accuracy
        });
      },
      fail: (error) => {
        console.error('获取位置失败:', error);
        reject(error);
      }
    });
  });
}

/**
 * 检查位置权限
 */
function checkLocationPermission() {
  return new Promise((resolve, reject) => {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userLocation'] === undefined) {
          // 用户未授权，可以调用 wx.authorize 申请授权
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => resolve(true),
            fail: () => reject(new Error('用户拒绝授权位置信息'))
          });
        } else if (res.authSetting['scope.userLocation']) {
          // 用户已授权
          resolve(true);
        } else {
          // 用户拒绝授权
          reject(new Error('用户已拒绝位置权限'));
        }
      },
      fail: reject
    });
  });
}

/**
 * 计算两点间距离（米）
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const radLat1 = lat1 * Math.PI / 180.0;
  const radLat2 = lat2 * Math.PI / 180.0;
  const a = radLat1 - radLat2;
  const b = lng1 * Math.PI / 180.0 - lng2 * Math.PI / 180.0;
  let s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
  s = s * 6378.137; // 地球半径
  s = Math.round(s * 10000) / 10000;
  return s * 1000; // 转换为米
}

/**
 * 逆地理编码 - 获取地址信息
 */
function reverseGeocode(latitude, longitude) {
  return new Promise((resolve, reject) => {
    // 这里可以集成腾讯地图或百度地图的逆地理编码API
    // 暂时返回经纬度信息
    resolve({
      address: `纬度: ${latitude.toFixed(6)}, 经度: ${longitude.toFixed(6)}`,
      latitude: latitude,
      longitude: longitude
    });
  });
}

module.exports = {
  getCurrentLocation,
  checkLocationPermission,
  calculateDistance,
  reverseGeocode
};