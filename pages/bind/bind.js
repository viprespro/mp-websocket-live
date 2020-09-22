const api = require('../../utils/api-tp.js')
const Config = require('../../config.js')
const app = getApp()
Page({

  /**
   * 页面的初始数据
   */
  data: {
    currentTime: 60,
    time: '发送验证码',
    // 按钮是否禁用
    flag: false,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(opts) {
    console.log(opts)
  },

  handleConfirm() {
    const {
      cell,
      vCode,
    } = this.data
    if (!(/^1([1-9])\d{9}$/.test(cell))) {
      wx.showToast({
        title: '输入手机号有误',
        icon: 'none',
        mask: true,
      })
      return;
    }
    if (!vCode) {
      wx.showToast({
        title: '验证码不能为空',
        icon: 'none',
        mask: true,
      })
      return;
    }

    wx.showLoading({
      title: '请求中...',
    })

    wx.login({
      success: (res) => {
        wx.getUserInfo({ // 获取用户的加密数据
          success(userRes) {
            let encryptedData = userRes.encryptedData;
            let iv = userRes.iv;
            if (res.code) {
              wx.request({
                url: `${Config.HTTP_REQUEST_URL}/wxsmall/Login/getCode`,
                method: "POST",
                data: {
                  code: res.code,
                  version: 2, // 老版本
                  encryptData: encryptedData,
                  iv: iv,
                  mobile: cell,
                  sms_code: vCode,
                  invite_code: app.globalData.invite_code
                },
                success: (codeRes) => {
                  // console.log(codeRes)
                  let data = codeRes.data
                  if (data.code == 0) {
                    const { token, invite_code } = data.data
                    wx.setStorageSync('token', token)
                    wx.setStorageSync('invite_code', invite_code)
                    app.globalData.invite_code = invite_code
                    // console.log(app.globalData.openPages)
                    const url = app.globalData.openPages || `/pages/live/live`
                    wx.reLaunch({ url })  // 防止可能是tabbar
                  } else {
                    wx.showModal({
                      title: '提示',
                      content: codeRes.data.message,
                    })
                  }
                },
                complete() {
                  wx.hideLoading()
                },
              })
            }
          }
        })
      },
    })
  },

  bindCodeInput(e) {
    this.setData({
      vCode: e.detail.value
    })
  },

  bindInput(e) {
    this.setData({
      cell: e.detail.value
    })
  },

  /**
   * 获取验证码
   */
  getCode() {
    let _this = this
    let _phone = this.data.cell;
    if (!(/^1(3|4|5|7|8|9)\d{9}$/i).test(_phone)) {
      wx.showModal({
        title: '提示',
        content: '您输入的手机号有误',
      })
    } else {
      if (!_this.data.flag) {

        api.post({
          url: '/wxsmall/Login/sendSms',
          data: {
            mobile: _phone,
            format: 'register'
          },
          success: function(res) {
            console.log(res)

            let currentTime = _this.data.currentTime
            _this.setData({
              time: currentTime + '秒'
            })

            let interval = setInterval(function() {
              _this.setData({
                time: (currentTime - 1) + '秒',
              })
              currentTime--
              if (currentTime <= 0) {
                clearInterval(interval)
                _this.setData({
                  time: '重新获取',
                  currentTime: 60,
                  flag: false
                })
              }
            }, 1000)
          }
        })

        _this.setData({
          flag: true
        })
      }
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function() {

  }
})