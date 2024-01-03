const templates = require('./templates')

module.exports = {
    cb:{
    parse_mode: 'HTML',
    reply_markup: {inline_keyboard:
    [
      [{
        text: `${templates.specificationsRepot} ${templates.specificationsRepotPrice}р`,
        callback_data: `oh, 350`
      }],
      [{
        text: `${templates.rightsReport} ${templates.rightsReportPrice}р`,
        callback_data: `op, 450`
      }],
      [{
        text: `${templates.cadastralReport} ${templates.cadastralReportPrice}р`,
        callback_data: `ks, 320`
      }],
      [{
        text: `${templates.fullCheckReport} ${templates.fullCheckReportPrice}р`,
        callback_data: `ss, 3500`
      }],
      [{
        text: `🔍 ${templates.backSearch}`,
        callback_data: `startSearchAgain`
      }]
    ]}
}}

