const app = getApp()
const api = require('../../utils/api-tp.js')
let that;

Page({

  /**
   * 页面的初始数据
   */
  data: {
    windowW: app.globalData.windowW,
    fullScreenHeight: app.globalData.screenH,
    headerH: app.globalData.CustomBar,
    follow: true,
    inputVal: '',
    userId: '', // 用户id
    groupId: null, // 群id
    playUrl: '', // 拉流地址
    barrageList: [],
    showInput: false, // 是否显示输入框
    focus: false,
    goodsList: [],
    pageIndex: 1,
    pageSize: 10,
    hasMore: true,
    showGoodsInfo: false,
    firstTap: false,
    showEmpty: false, // 是否展示缺省提示
    nickname: '', // 当前用户昵称
    scrollTop: '', // 设置cover-view 设置顶部滚动的偏移量
    count: 0, // 点赞数
    online: '',
    showTips: false, // 是否显示某个人加入进入直播间
    online_people: '', // 观看人数 
    anchor_cover: '', // 主播封面
  },

  // 通知主播已经下线
  showWarningOffAndExit() {
    wx.showModal({
      title: '提示',
      content: '主播已经离开了~',
      showCancel: false,
      confirmText: '我知道了',
      confirmColor: '#FE6889',
      success: res => {
        if (res.confirm) {
          wx.switchTab({
            url: `/pages/live/live`,
          })
        }
      }
    })
  },

  // 发送或者显示弹幕
  showBarrage(opts) {
    let temp = {}
    temp.nickname = opts.nickname
    temp.words = opts.message
    temp.color = app.getRandomFontColor()
    let barrageList = [...that.data.barrageList, temp]
    that.setData({ barrageList })
    that.setScrollTop();
  },

  setScrollTop() {
    var query = wx.createSelectorQuery(), e = that;
    wx.createSelectorQuery().in(e).select('.barrage').boundingClientRect(function (res) {
      console.log(res)
      e.setData({
        chatbottom: res.bottom,
      })
    }).exec()

    query.in(e).select('.item-outer').boundingClientRect(function (res) {
      if (res.bottom > e.data.chatbottom) {
        let temp = Math.ceil(parseInt(res.bottom) - parseInt(e.data.chatbottom))
        e.setData({
          scrollTop: temp // 如此保证scrollTop的值 让滚动条一直滚动到最后 9999 开发工具可以设置为辞职 苹果真机不行
        })
      }
    }).exec()
  },

  onLoad: function(options) {
    wx.showLoading({
      title: '加载中...',
    })
    that = this;
    
    // 设置屏幕常亮 兼容ios
    wx.setKeepScreenOn({ keepScreenOn: true })
    // 设置屏幕亮度 0-1范围 当前设置为用户自己调节
    // wx.setScreenBrightness({ value: .6 })

    // 获取用户昵称
    that.getUserInfo()

    // 实现登录用户扫码进入直播间返回
    if (options.backHomeFlag) {
      this.setData({
        backHomeFlag: options.backHomeFlag
      })
    }

    if(options.like) {
      this.setData({ count: options.like })
    }

    if (options.number) {
      this.setData({
        number: options.number
      })
      this.getLiveInfo()
    }

    let query = wx.createSelectorQuery()
    query.select('.barrage').boundingClientRect(function(rect) {
      console.log(rect)
    }).exec();

  },

  // 主推商品详情
  toDetail(e) {
    let { id } = e.currentTarget.dataset
    let { number } = this.data // number表明来自于当前主播
    let url = `/pages/product-detail/index?id=${id}&number=${number}`
    wx.navigateTo({
      url,
    })
  },

  handleLikeClick() {
    this.setData({
      count: Number(this.data.count) + 1
    });
  },


  preventDefault(e) {
    return;
  },

  getUserInfo() {
    let token = wx.getStorageSync('token')
    api.get({
      url: '/wxsmall/User/getUserInfo',
      data: {
        token,
      },
      success: res => {
        console.log(res)
        let {
          nickname,
          avatar
        } = res.data
        this.setData({
          nickname,
          avatar
        })
      }
    })
  },

  hideGoods() {
    this.setData({
      showGoodsInfo: false,
      showInput: false,
      fullScreenHeight: app.globalData.screenH
    })
  },

  showGoods() {
    let data = this.data
    if (!data.firstTap) {
      this.getGoodsList()
      this.setData({
        firstTap: true
      })
    }
    this.setData({
      showGoodsInfo: true,
    })
  },

  getGoodsList() {
    let data = this.data
    if (!data.hasMore) return
    api.get({
      url: '/wxsmall/Live/liveCart',
      data: {
        number: data.number,
        page: data.pageIndex++,
        pagesize: data.pageSize
      },
      success: res => {
        console.log(res)
        let ret = res.data
        let len = ret.length
        let emptyFlag = false
        let moreFlag = true
        if (!len && data.pageIndex == 2) { // 空数组
          emptyFlag = true
        }

        if (len < data.pageSize) { // 没有更多数据
          moreFlag = false
        }

        let originalList = [...data.goodsList]
        this.setData({
          total: res.total,
          goodsList: originalList.concat(ret),
          hasMore: moreFlag ? true : false,
          showEmpty: emptyFlag ? true : false
        })
      }
    })
  },

  navCart() {
    let url = `/pages/cart/cart`
    wx.navigateTo({
      url,
    })
  },

  navPurchase(e) {
    let { number } = this.data // number表明来自于当前主播
    let url = `/pages/product-detail/index?id=${e.currentTarget.dataset.id}&number=${number}`
    wx.navigateTo({
      url,
    })
  },


  // 获取直播信息
  getLiveInfo() {
    let token = wx.getStorageSync('token')
    let data = this.data
    api.get({
      url: '/wxsmall/Live/viewLive',
      data: {
        token,
        number: data.number,
        v: 2
      },
      success: res => {
        console.log(res)
        //意外情况
        if (res.code == 1) {
          wx.showToast({
            title: res.message,
            duration: 2000,
            icon: 'none'
          })
          setTimeout(() => {
            let pages = getCurrentPages()
            if (pages.length > 1) {
              wx.navigateBack({
                delta: 1
              })
            }else {
              wx.switchTab({
                url: '/pages/live/live',
              })
            }
          }, 2000)
          return;
        }
        res = res.data
        // websocket方式
        app.openSocket(that.data.number, that)
        // websocket方式 ends
        this.setData({
          playUrl: res.url,
          other_info: res,
          follow: res.is_follow,
          main_goods: res.main_goods,
          online_people: res.online,
          anchor_cover: res.cover
        })
      }
    })
  },


  /**
   * 发送弹幕问题
   */
  sendTap() {
    let { inputVal } = this.data
    if (!inputVal) {
      wx.showToast({ title: '发送内容不能为空', duration: 1500, icon: 'none', mask: true })
      return;
    }

    app.sendMessage(inputVal)
    this.setData({ inputVal: '' })
  },


  bindInput(e) {
    this.setData({
      inputVal: e.detail.value
    })
  },

  handleInteractionTap() {
    let data = this.data
    let temp;
    if (!data.showInput) {
      temp = data.fullScreenHeight - 50
    } else {
      temp = app.globalData.screenH
    }
    this.setData({
      showInput: !this.data.showInput,
      fullScreenHeight: temp,
      focus: true
    })
  },

  followTap() {
    wx.showToast({
      title: '已关注',
      icon: 'none'
    })
    let token = wx.getStorageSync('token')
    let data = this.data
    api.post({
      url: '/wxsmall/Live/followLive',
      data: {
        token,
        number: data.number
      },
      success: res => {
        console.log(res)
        if(res.code != 0) {
          app.msg(res.message)
        }
      }
    })

    this.setData({
      follow: true
    })
  },

  onReady(res) {
    this.ctx = wx.createLivePlayerContext('player')
  },
  statechange(e) {
    console.log('live-player code:', e.detail.code)
  },
  error(e) {
    console.error('live-player error:', e.detail.errMsg)
  },


  onUnload() {
    this.backTap()
  },

  backTap() {
    app.closeSocket()
    // 扫码进入退出时候回到首页
    if (that.data.backHomeFlag) {
      wx.switchTab({url: '/pages/live/live'})
    } else {
      wx.navigateBack({delta: 1})
    }
  },

  /**
  * 用户点击右上角分享
  */
  onShareAppMessage: function () {
    let { number, anchor_cover } = this.data
    return {
      title: '直播间分享啦！',
      imageUrl: anchor_cover,
      path: `/pages/load/load?number=${number}&invite_code=${app.globalData.invite_code}`,
      success: function (res) {
        console.log("转发成功:");
      },
      fail: function (res) {
        console.log("转发失败:");
      }
    }
  }
})