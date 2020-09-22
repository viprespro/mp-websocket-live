const api = require('/utils/api-tp.js');
App({
  onLaunch: function(option) {
    console.log(option)

    wx.login({
      success: res=> {
        console.log(res.code)
      }
    })

    const that = this
    // 针对自定义头部添加
    wx.getSystemInfo({
      success: e => {
        // console.log(e)
        this.globalData.userSystem = e.platform
        this.globalData.windowW = e.windowWidth
        this.globalData.windowH = e.windowHeight
        this.globalData.screenH = e.screenHeight; // 手机屏幕总高度
        this.globalData.StatusBar = e.statusBarHeight;
        let custom = wx.getMenuButtonBoundingClientRect();
        this.globalData.Custom = custom;
        this.globalData.CustomBar = custom.bottom + custom.top - e.statusBarHeight;
      }
    })

    const updateManager = wx.getUpdateManager();
    updateManager.onCheckForUpdate(function(res) {
      // 请求完新版本信息的回调
    })
    updateManager.onUpdateReady(function() {
      wx.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        success: function(res) {
          if (res.confirm) {
            // 新的版本已经下载好，调用 applyUpdate 应用新版本并重启
            updateManager.applyUpdate()
          }
        }
      })
    });
    updateManager.onUpdateFailed(function() {
      return that.msg('新版本下载失败')
    })

    if (that.globalData.CustomBar && that.globalData.StatusBar) {
      if (option.query.hasOwnProperty('scene')) {
        switch (option.scene) {
          //扫描小程序码
          case 1047:
            this.globalData.invite_code = option.query.scene;
            break;
            //长按图片识别小程序码
          case 1048:
            var scene = decodeURIComponent(option.query.scene); // 参数形如： 565256_EGJLS
            if (scene.indexOf('_') > -1) { // 传递房间号与邀请码
              let [number, invite_code] = scene.split('_')
              app.globalData.invite_code = invite_code;
              app.globalData.number = number;
              app.globalData.openPages = `/pages/live-detail/live-detail?number=${number}&backHomeFlag=true`
              wx.redirectTo({
                url: `/pages/load/load`
              })
            } else { // 只是传递房间号 进入房间即可 // 参数形如： 565256
              app.globalData.number = scene;
              app.globalData.openPages = `/pages/live-detail/live-detail?number=${number}&backHomeFlag=true`
              wx.redirectTo({
                url: `/pages/load/load`
              })
            }
            break;
            //手机相册选取小程序码
          case 1049:
            break;
            //直接进入小程序
          case 1001:
            break;
        }
      }
    }

    // 如果用户已登录
    if (this.hasLogin()) {
      this.getUserInfo()
    }

  },

  // 执行打开socket
  openSocket(number,_that) {
    //打开时的动作
    wx.onSocketOpen(() => {
      console.log('WebSocket 已连接')
      this.globalData.socketStatus = 'connected';
      this.sendMessageToLoginSocket(number); // 链接webscoket 以发送消息的形式 {type: "login", token: "token", room_id: "room_id"}
    })
    //断开时的动作
    wx.onSocketClose(() => {
      console.log('WebSocket 已断开')
      this.globalData.socketStatus = 'closed'
    })
    //报错时的动作
    wx.onSocketError(error => {
      console.error('socket error:', error)
    })
    // 监听服务器推送的消息
    wx.onSocketMessage(data => {
      //把JSONStr转为JSON
      data = data.data.replace(" ", "");
      if (typeof data != 'object') {
        data = data.replace(/\ufeff/g, ""); //重点
        data = JSON.parse(data);
      }
      console.log("【websocket监听到消息】内容如下：");
      console.log(data);
      if(data.type === 'say') { // 成员说话
        // _that.setData({ say_nickname: data.nickname, say_msg: data.message })
        _that.showBarrage({ nickname: data.nickname, message: data.message })
      }
      if(data.type === 'into') { // 人员登录进来
        _that.setData({ online_people: data.online })
        if(data.is_user === 1) { 
          _that.showBarrage({ nickname: data.nickname, message: '进入了直播间' })
        }
      }
      if (data.type === 'livelogout') { // 主播退出
        _that.showWarningOffAndExit()
      }
      if(data.type === 'online' && data.online) { // 用户退出
        _that.setData({ online_people: data.online })
      }
    })
    // 打开信道
    wx.connectSocket({
      url: "wss://kebo.weirong100.com:2345",
      header: {
        'content-type': 'application/json'
      },
      success: res => {
        console.log(res)
      },
    })
  },

  //关闭信道
  closeSocket() {
    if (this.globalData.socketStatus === 'connected') {
      wx.closeSocket({
        success: () => {
          this.globalData.socketStatus = 'closed'
        }
      })
    }
  },

  //成员或主播发送消息函数
  sendMessage(_val) {
    if (this.globalData.socketStatus === 'connected') {
      //自定义的发给后台识别的参数 ，我这里发送的是name
      let msg = {
        type: 'say',
        message: _val
      }
      msg = JSON.stringify(msg)
      wx.sendSocketMessage({ data: msg })
    }
  },

  // 发送登录消息
  sendMessageToLoginSocket(_number) {
    let msg = {
      type: "login",
      token: wx.getStorageSync('token'),
      room_id: _number
    }
    msg = JSON.stringify(msg)
    console.log(msg)
    wx.sendSocketMessage({
      data: msg
    })
  },

  // 获取用户信息
  getUserInfo() {
    const token = wx.getStorageSync('token')
    api.get({
      url: '/wxsmall/User/getUserInfo',
      data: {
        token,
      },
      success: res => {
        console.log(res)
        let {
          type,
          live_status,
          invite_code
        } = res.data
        this.globalData.userType = type
        this.globalData.live_status = live_status
        this.globalData.invite_code = invite_code
        if (res.data.hasOwnProperty('reason')) {
          this.globalData.reason = res.data.reason
        }
      }
    })
  },

  msg(title, duration = 1500, mask = true, icon = 'none') {
    if (Boolean(title) === false) return
    wx.showToast({
      title,
      icon,
      duration,
      mask
    })
  },

  hasLogin() {
    let token = wx.getStorageSync('token')
    if (!token) {
      return false
    }
    return true
  },

  /**
 * 获取随机颜色
 */
 getRandomFontColor() {
    let red = Math.floor(Math.random() * 266);
    let green = Math.floor(Math.random() * 266);
    let blue = Math.floor(Math.random() * 266);
    return 'rgb(' + red + ',' + green + ' , ' + blue + ')'
  },


  /**
   * 全局变量定义
   */
  globalData: {
    userSystem: '',
    userInfo: null,
    bind_phone: '', //绑定过的手机号
    invite_code: '', // 邀请码
    windowW: '',
    windowH: '',
    openPages: '',
    locte_cate: {}, //用于定位分类栏
    logo: '',
    share_img: 'https://kebo.weirong100.com/static/home/img/shop/img.jpg',
    userType: null, // 用户身份标识
    live_status: '', // live_status 0=可申请 1=审核中 3=直播封禁 4=重复申请
    reason: '', // 审核被驳回的原因
    invite_code: '', // 用户邀请码
    number: '', // 主播房间号
    indexPage: '/pages/live/live', // tabbar的分享进入的路径
    indexTitle: '好物可播小程序分享啦',
    // 链接websocket
    socketStatus: 'closed',
  },
})