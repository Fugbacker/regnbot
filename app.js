require('dotenv').config()
const {startText,answerInformationEgrn} = require('./helper')
const express = require('express')
const app = express()
const keyboard = require('./keyboard')
const templates = require('./templates')
const PORT = 3000
const fs = require('fs');
const puppeteer = require('puppeteer');
const link = templates.link;
const timeout = 15000;
app.listen(PORT, () => console.log(`My server is running on port ${PORT}`))
const TelegramBot = require('node-telegram-bot-api');
const { default: axios } = require('axios');
const { setTimeout } = require('timers')
const e = require('express')
const token = process.env.TELEGRAM_KEY
const bot = new TelegramBot(token, { polling: true });
let userStates = {}
const USER_STATES = {
  USER_NAME: templates.USER_NAME,
  GO_TO_PAY: templates.GO_TO_PAY,
  READY_TO_PAY: templates.READY_TO_PAY,
  ENTER_ADDRESS: templates.ENTER_ADDRESS,
  RECIVED_EGRP: templates.RECIVED_EGRP,
  ENTER_EMAIL: templates.ENTER_ADDRESS,
  ENTER_CADASTR_NUMBER: templates.ENTER_CADASTR_NUMBER,
  IF_WE_HAVE_MORE_CADNUMBERS: templates.IF_WE_HAVE_MORE_CADNUMBERS
}
const OPERATIONS = {
  REPORT_TYPES: templates.REPORT_TYPES,
  SERVICE_DESCRIPTOINS: templates.SERVICE_DESCRIPTOINS,
  FIND_OBJECT: templates.FIND_OBJECT
}
const {getApiUrl} = require('./helper')
const {getScrapUrl} = require('./helper')
const runPuppeteer = async (address) => {
  const searcher = address
  console.log('Application started. Please wait...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
    'ignoreHTTPSErrors': true
  })
  let page = await browser.newPage()
  await page.setDefaultTimeout(10000)
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0');
  await page.setViewport({
    width: 1080,
    height: 1920,
  });
  await page.goto(link);
  console.log('загрузили страницу');
  await page.type('input[type="text"]', searcher);
  await page.keyboard.press('Enter')
  await page.waitForSelector('div.table__items');
  let html = await page.evaluate(async () => {
    let container = await Array.from(document.querySelectorAll('[data-id]'))
      .map(it => it.getAttribute('data-id'))
      .filter(it => it.length > 1)
      .slice(0, 5)

    return container
  })
  await browser.close();
  console.log ('парсинг закончен')
  return html
}
const serviceDescriptoinText = templates.serviceDescriptoinText
const findObjectText = templates.findObjectText
const reportTypesText = templates.reportTypesText
const {getEgrpMessage} = require('./helper')
const {OPERATIONS_ACTIONS} = require('./helper')
bot.on('message', (msg) => {
  (async () => {
    const chatId = msg.chat.id;
    const htmlText = startText()
    // bot.sendMessage(chatId, JSON.stringify( msg))
     if (msg.text === '\/start') {
      bot.sendMessage(chatId, htmlText, {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [
            [`📝 ${OPERATIONS.REPORT_TYPES}`,`📄 ${OPERATIONS.SERVICE_DESCRIPTOINS}`],
            [`🔍 ${OPERATIONS.FIND_OBJECT}`]
          ]
        }
      });
  return;
  } 
    if (msg.text === `📄 ${OPERATIONS.SERVICE_DESCRIPTOINS}`) {
      bot.sendMessage(chatId, serviceDescriptoinText, { parse_mode: 'HTML' });
      return;
    }
    if (msg.text === `🔍 ${OPERATIONS.FIND_OBJECT}`) {
      userStates = { ...userStates, [msg.from.id]: { ...userStates[msg.from.id], currentStep: USER_STATES.USER_NAME, userName: msg.chat.username } }
      bot.sendMessage(chatId, findObjectText, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard:
            [
              [{
                text: templates.addressSearch,
                callback_data: `addressSearch`
              }],
              [{
                text: templates.cadastralSearch,
                callback_data: `cadastrSearch`
              }]
            ]
        }
      })
      return;
    }
    if (msg.text === `📝 ${OPERATIONS.REPORT_TYPES}`) {
      bot.sendMessage(chatId, reportTypesText, { parse_mode: 'HTML' });
      return;
    }
    const currentUserState = userStates[msg.from.id]

    if (currentUserState?.currentStep === USER_STATES.ENTER_CADASTR_NUMBER) {
        userStates = { ...userStates, [msg.from.id]: { ...userStates[msg.from.id], currentStep: USER_STATES.GO_TO_PAY, cadastrNumber: msg.text } }
        bot.sendMessage(chatId, 'Поиск...')
        const egrp = getApiUrl(msg.text)
        const api = getScrapUrl(msg.text)
        axios.get(api).then(({ data }) => {
          console.log('DATA', data)
          if (data.message === 'Not Found') {
            bot.sendMessage(chatId, templates.cantFindCadastralNumber, {
              reply_markup: {
                inline_keyboard:
                  [
                    [{
                      text: templates.addressSearch,
                      callback_data: `addressSearch`
                    }],
                    [{
                      text: templates.cadastralSearch,
                      callback_data: `cadastrSearch`
                    }]
                  ]
              }
            })
          }
          if (typeof data.response === 'undefined') {
            return
          }
          const dataMessage = answerInformationEgrn(data)
          axios.get(egrp).then(({ data }) => {
            userStates = {
              ...userStates, [msg.from.id]: {
                ...userStates[msg.from.id], currentStep: USER_STATES.RECIVED_EGRP,
                address: msg.text, egrp: getEgrpMessage(data, dataMessage)
              }
            }
            bot.sendMessage(chatId, getEgrpMessage(data, dataMessage), keyboard.cb)
          })
        })
        return;
    }
    if (currentUserState?.currentStep === USER_STATES.ENTER_ADDRESS) {
      try {
        bot.sendMessage(chatId, templates.justSearch)
        const html = await runPuppeteer(msg.text)
        if (html.length === 1) {
          bot.sendMessage(chatId, templates.findOneObject)
          const egrp = getApiUrl(html)
          const api = getScrapUrl(html)
          axios.get(api).then(({ data }) => {
            userStates = { ...userStates, [msg.from.id]: { ...userStates[msg.from.id], currentStep: USER_STATES.GO_TO_PAY, cadastrNumber: data.response.objectCn } }
            const dataMessage = answerInformationEgrn(data)
            axios.get(egrp).then(({ data }) => {
              userStates = {
                ...userStates, [msg.from.id]: {
                  ...userStates[msg.from.id], currentStep: USER_STATES.RECIVED_EGRP,
                }
              }
              bot.sendMessage(chatId, getEgrpMessage(data, dataMessage), keyboard.cb)
            })
          })
          return;
        }

        if (html.length > 1) {
          bot.sendMessage(chatId, templates.findSomeObjects)
          html.map((it) => {
            const egrp = getApiUrl(it)
            const api = getScrapUrl(it)
            axios.get(api).then(({ data }) => {
              const dataMessage = answerInformationEgrn(data)
              let kadnum = data.response.objectCn
              axios.get(egrp).then(({ data }) => {
                console.log('USERSTATES', userStates)
                bot.sendMessage(chatId, getEgrpMessage(data, dataMessage), {
                  parse_mode: 'HTML',
                  reply_markup: {
                    inline_keyboard: [
                      [{
                        text: kadnum,
                        callback_data: 'kadnum'
                      }]
                    ]
                  }
                })
              })
            })
          })
        }
      } catch (error) {
        console.log (error)
        bot.sendMessage(chatId, templates.cantFindObject, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard:
              [
                [{
                  text: templates.addressSearch,
                  callback_data: `addressSearch`
                }],
                [{
                  text: templates.cadastralSearch,
                  callback_data: `cadastrSearch`
                }]
              ]
          }
        })
        return;
      }
    }
    if (currentUserState?.currentStep === USER_STATES.CHOOSE_DOCUMENT) {

      userStates = { ...userStates, [msg.from.id]: { ...userStates[msg.from.id], currentStep: USER_STATES.READY_TO_PAY, mail: msg.text } }
      console.log(currentUserState)
      console.log('RRRRRR', userStates)
      let document = userStates[msg.from.id].info.split(',')[0]
      let price = userStates[msg.from.id].info.split(',')[1]
      let fulPrice = price.trim()
      console.log('RRRRRR', userStates)
      bot.sendMessage(chatId, `${templates.isReadyGoToPay} <b>${currentUserState.cadastrNumber}</b>`, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard:
            [
              [{
                text: templates.goToPay,
                url: `https://regrn.su/insta?cn=${userStates[msg.from.id].cadastrNumber}&doc=${document}&email=${userStates[msg.from.id].mail}&price=${fulPrice}`
              }],
              [{
                text: templates.backSearch,
                callback_data: `startSearchAgain`
              }]
            ]
        }
      })

      return;
    }
    if (typeof userStates.currentStep === 'undefined') {
      bot.sendMessage(chatId, findObjectText, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard:
            [
              [{
                text: templates.addressSearch,
                callback_data: `addressSearch`
              }],
              [{
                text: templates.cadastralSearch,
                callback_data: `cadastrSearch`
              }]
            ]
        }
      })
    }
  })();

})


bot.on('callback_query', query => {
  // console.log(query)
  const currentUserState = userStates[query.from.id]
  if (query.data === 'addressSearch') {
    userStates = { ...userStates, [query.from.id]: { ...userStates[query.from.id], currentStep: USER_STATES.ENTER_ADDRESS } }
    bot.sendMessage(query.message.chat.id, templates.inputAddress)
    return;
  }
  if (query.data === 'cadastrSearch') {
    userStates = { ...userStates, [query.from.id]: { ...userStates[query.from.id], currentStep: USER_STATES.ENTER_CADASTR_NUMBER } }
    bot.sendMessage(query.message.chat.id, templates.enterCasastralNumber)
    return;
  }
  if (query.data === 'startSearchAgain') {
    bot.sendMessage(query.message.chat.id, findObjectText, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard:
          [
            [{
              text: templates.addressSearch,
              callback_data: `addressSearch`
            }],
            [{
              text: templates.cadastralSearch,
              callback_data: `cadastrSearch`
            }]
          ]
      }
    })
    return;
  }
  if (query.data === 'kadnum') {
    let number = query.message.text.split(' ')[2].split('\n')[0]
    userStates = { ...userStates, [query.from.id]: { ...userStates[query.from.id], currentStep: USER_STATES.ENTER_CADASTR_NUMBER, cadastrNumber: number } }
    const api = getScrapUrl(number)
    axios.get(api).then(({ data }) => {
      const dataMessage = answerInformationEgrn(data)
      bot.sendMessage(query.message.chat.id, answerInformationEgrn(data), keyboard.cb)
    })
    return;

  }

  else {
    userStates = { ...userStates, [query.from.id]: { ...userStates[query.from.id], currentStep: USER_STATES.CHOOSE_DOCUMENT, info: query.data } }
    bot.sendMessage(query.message.chat.id, templates.mailText)
  }
})

bot.on("polling_error", console.log);




