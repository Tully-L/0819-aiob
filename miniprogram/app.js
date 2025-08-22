// app.js
App({
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        // env 参数说明：
        //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
        //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
        //   如不填则使用默认环境（第一个创建的环境）
        // env: 'your-env-id', // 请在微信开发者工具中创建云开发环境后填入环境ID
        traceUser: true,
      });
    }

    // 检查登录状态
    this.checkLoginStatus();
  },

  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    const userRole = wx.getStorageSync('userRole');
    
    // 获取当前页面路径
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const currentRoute = currentPage ? currentPage.route : '';
    
    // 不需要登录的页面
    const publicPages = [
      'pages/auth/login',
      'pages/auth/register',
      'page/component/index',
      'page/API/index',
      'page/cloud/index',
      'page/extend/index'
    ];
    
    // 如果当前页面是公开页面，不需要检查登录状态
    if (publicPages.includes(currentRoute)) {
      return;
    }
    
    // 如果用户未登录，跳转到登录页面
    if (!userInfo || !userRole) {
      wx.redirectTo({
        url: '/pages/auth/login'
      });
      return;
    }
    
    // 检查页面权限
    const adminPages = [
      'pages/admin/dashboard',
      'pages/admin/drivers',
      'pages/admin/calls',
      'pages/admin/settings'
    ];
    
    const driverPages = [
      'pages/driver/checkin',
      'pages/driver/profile',
      'pages/driver/history'
    ];
    
    // 如果是管理员页面但用户不是管理员
    if (adminPages.includes(currentRoute) && userRole !== 'admin') {
      wx.redirectTo({
        url: '/pages/driver/checkin'
      });
      return;
    }
    
    // 如果是司机页面但用户不是司机或管理员
    if (driverPages.includes(currentRoute) && !['driver', 'admin'].includes(userRole)) {
      wx.redirectTo({
        url: '/pages/auth/login'
      });
      return;
    }
  },

  globalData: {
    userInfo: null,
    userRole: null
  }
});