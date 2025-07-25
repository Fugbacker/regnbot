const templates = require('./templates')

module.exports = {
    cb:{
    parse_mode: 'HTML',
    reply_markup: {inline_keyboard:
    [
      [{
        text: `${templates.expressReport} ${templates.expressReportPrice}р`,
        callback_data: `ex, 500`
      }],
      [{
        text: `${templates.specificationsRepot} ${templates.specificationsRepotPrice}р`,
        callback_data: `oh, 750`
      }],
      [{
        text: `${templates.rightsReport} ${templates.rightsReportPrice}р`,
        callback_data: `op, 800`
      }],
      [{
        text: `${templates.cadastralReport} ${templates.cadastralReportPrice}р`,
        callback_data: `ks, 550`
      }],
      [{
        text: `${templates.fullCheckReport} ${templates.fullCheckReportPrice}р`,
        callback_data: `ss, 7500`
      }],
      [{
        text: `🔍 ${templates.backSearch}`,
        callback_data: `startSearchAgain`
      }]
    ]}
}}

