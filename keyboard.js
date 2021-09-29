const templates = require('./templates')

module.exports = {
    cb:{
    parse_mode: 'HTML',
    reply_markup: {inline_keyboard:
    [
      [{
        text: `${templates.specificationsRepot} ${templates.specificationsRepotPrice}р`,
        callback_data: `fl, 250`
      }],
      [{
        text: `${templates.rightsReport} ${templates.rightsReportPrice}р`,
        callback_data: `rh, 350`
      }],
      [{
        text: `${templates.cadastralReport} ${templates.cadastralReportPrice}р`,
        callback_data: `cs, 250`
      }],
      [{
        text: `${templates.fullCheckReport} ${templates.fullCheckReportPrice}р`,
        callback_data: `fc, 950`
      }]
    ]}
}}

