const app = getApp()
const api = require('../../../utils/api-tp.js')
const Config = require('../../../config.js')
let that;
Page({

  /**
   * 页面的初始数据
   */
  data: {
    windowW: app.globalData.windowW,
    fullScreenHeight: app.globalData.screenH,
    headerH: app.globalData.CustomBar,
    userId: '', // 用户id
    barrageList: [],
    showInput: false, // 是否显示输入框
    focus: false,
    firstTap: false,
    goodsList: [],
    pageIndex: 1,
    pageSize: 10,
    hasMore: true,
    showGoodsInfo: false,
    showEmpty: false, // 是否展示缺省提示
    ids: '', // 已经选中的商品id
    showTips: false, // 是否显示某个人加入进入直播间
    online_people: '', // 观看人数 
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

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    wx.showLoading({
      title: '加载中...',
    })
    that = this;
    // 设置屏幕常亮 兼容ios
    wx.setKeepScreenOn({ keepScreenOn: true })
    // 设置屏幕亮度 0-1范围 设置了 用户自己去设置调节屏幕的亮度
    // wx.setScreenBrightness({ value: .6 }) 
    
    this.ctx = wx.createLivePusherContext('pusher')
    if (options.object) { // 开启直播传递古来直播间的名称和封面图
      let parse = JSON.parse(options.object)
      let { name, cover, ids } = parse
      this.setData({
        live_name: name,
        cover,
        ids,
      })
      this.getPushInfo()
    }
    let query = wx.createSelectorQuery()
    query.select('.barrage').boundingClientRect(function(rect) {
      // console.log(rect)
    }).exec();
  },

  // 主推商品详情
  toDetail(e) {
    let { id } = e.currentTarget.dataset
    let url = `/pages/product-detail/index?id=${id}`
    wx.navigateTo({
      url,
    })
  },

  preventDefault() {
    return;
  },

  bindInput(e) {
    this.setData({
      inputVal: e.detail.value
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

  navCart() {
    let url = `/pages/cart/cart`
    wx.navigateTo({ url })
  },

  // 前往商品详情
  navPurchase(e) {
    let url = `/pages/product-detail/index?id=${e.currentTarget.dataset.id}`
    wx.navigateTo({
      url,
    })
  },

  hideGoods() {
    this.setData({ showGoodsInfo: false, showInput: false, fullScreenHeight: app.globalData.screenH })
  },

  showGoods() {
    let data = this.data
    if (!data.firstTap) {
      this.getGoodsList()
      this.setData({
        firstTap: true
      })
    }
    this.setData({ showGoodsInfo: true, })
  },

  getGoodsList() {
    let data = this.data
    if (!data.hasMore) return
    api.get({
      url: '/wxsmall/Live/liveCart',
      data: {
        number: data.info.number,
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

  // 获取推流信息
  getPushInfo() {
    let data = this.data
    wx.uploadFile({
      url: Config.HTTP_REQUEST_URL + '/wxsmall/Live/push',
      filePath: data.cover,
      name: 'cover', // 后端需要通过此字段来获取
      header: {
        "Content-Type": "multipart/form-data",
        "Charset": "utf-8"
      },
      formData: {
        token: wx.getStorageSync('token'),
        title: data.live_name,
        goods_ids: data.ids,
        v: 2, // 1 腾讯IM 2 websocket
      },
      success: function(res) {
        res = JSON.parse(res.data)
        if (res.code == 0) { // 推流信息
          that.setData({
            info: res.data,
            main_goods: res.data.main_goods,
            online: res.online
          })
          // websocket starts
          app.openSocket(res.data.number, that)
          // websocket ends
        } else {
          app.msg(res.message)
          setTimeout(() => {
            wx.navigateBack({ delta: 1 })
          }, 2000)
        }
      },
      fail: function(res) {
        console.log(res)
      },
      complete: function() {
        wx.hideLoading()
      }
    })
  },

  onReady(res) {
    this.ctx = wx.createLivePusherContext('pusher')
  },

  statechange(e) {
    console.log('live-pusher code:', e.detail.code)
  },

  // 旋转相机
  rotateTap() {
    this.ctx.switchCamera({
      success: res => {
        console.log('switchCamera success')
      },
      fail: res => {
        console.log('switchCamera fail')
      }
    })
  },

  backTap() {
    wx.showModal({
      title: '提示',
      content: '返回即代表结束直播，确定退出吗？',
      success: res => {
        if (res.confirm) {
          wx.navigateBack({
            delta: 1
          })

          app.closeSocket()
        }
      }
    })
  },

  onUnload() {
    app.closeSocket()
  },

  // 主播分享自己的直播间
  onShareAppMessage: function() {
    let { number} = this.data.info
    return {
      title: '直播间分享啦！',
      imageUrl: this.data.cover,
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