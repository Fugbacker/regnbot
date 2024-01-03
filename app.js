require('dotenv').config()
const md5 = require('md5')

const express = require('express')
const app = express()
const PORT = 3000
app.listen(PORT, () => console.log(`My server is running on port ${PORT}`))
const TelegramBot = require('node-telegram-bot-api')
const { default: axios } = require('axios')

const keyboard = require('./keyboard')
const templates = require('./templates')
const {startText,answerInformationEgrn, answerInformationEgrn1, dadataTokenChanger} = require('./helper')

const { MongoClient } = require('mongodb')
const url = process.env.MONGO_URL
const client = new MongoClient(url, { useUnifiedTopology: true })

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0
const token = process.env.TELEGRAM_KEY

const bot = new TelegramBot(token, { polling: true });

let userStates = {}

const USER_STATES = {
  USER_NAME: templates.USER_NAME,
  CHOOSE_DOCUMENT: templates.CHOOSE_DOCUMENT,
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


const serviceDescriptoinText = templates.serviceDescriptoinText
const findObjectText = templates.findObjectText
const abraCadabraEnter = templates.abraCadabraEnter
const reportTypesText = templates.reportTypesText
const {getEgrpMessage} = require('./helper')

bot.on('message', (msg) => {
  (async () => {
    const chatId = msg.chat.id;
    const htmlText = startText()
    // если нажали на кнопку старт или открыли меню, появляется клавиатура с кнопками
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

  //если нажали описание документов
    if (msg.text === `📄 ${OPERATIONS.SERVICE_DESCRIPTOINS}`) {
      bot.sendMessage(chatId, serviceDescriptoinText, { parse_mode: 'HTML' });
      return;
    }

  // если нажали искать объект, два варианта, по кадастровому номеру или адресу
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

  // если нажали описание отчетов
    if (msg.text === `📝 ${OPERATIONS.REPORT_TYPES}`) {
      bot.sendMessage(chatId, reportTypesText, { parse_mode: 'HTML' });
      return;
    }

  // записываем на каком шаге юзер
    const currentUserState = userStates[msg.from.id]
    console.log('CURRENTSTEP', currentUserState)

  // если чел ввел текст раньше времени

    if (currentUserState?.currentStep === USER_STATES.USER_NAME) {
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

  // поиск по кадастровому номеру
    if (currentUserState?.currentStep === USER_STATES.ENTER_CADASTR_NUMBER) {
        userStates = { ...userStates, [msg.from.id]: { ...userStates[msg.from.id], currentStep: USER_STATES.READY_TO_PAY, cadastrNumber: msg.text } }
        const regexp = /\d+\:\d+\:\d+\:\d+/g
        const checker = regexp.test(msg.text)
        if (!checker) {
          userStates = { ...userStates, [msg.from.id]: { ...userStates[msg.from.id], currentStep: USER_STATES.ENTER_CADASTR_NUMBER, cadastrNumber: msg.text } }
          bot.sendMessage(chatId, templates.enterCasastralNumberError, {
            reply_markup: {
              inline_keyboard:
                [
                  [{
                    text: templates.addressSearch,
                    callback_data: `addressSearch`
                  }]
                ]
            }
          })
        } else {
          bot.sendMessage(chatId, 'Поиск...')
          const egrp = getApiUrl(msg.text)
          const api = getScrapUrl(msg.text)
          axios.get(api).then(({ data }) => {
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
            } else {
              const dataMessage = answerInformationEgrn(data)
              axios.get(egrp).then(({ data }) => {
                userStates = {
                  ...userStates, [msg.from.id]: {
                    ...userStates[msg.from.id], currentStep: USER_STATES.RECIVED_EGRP,
                    address: msg.text, egrp: getEgrpMessage(data, dataMessage)
                  }
                }
                bot.sendMessage(chatId, userStates[msg.from.id].egrp, keyboard.cb)
              })
            }
          })
        }
        return;
    }
  // поиск по адресу
    if (currentUserState?.currentStep === USER_STATES.ENTER_ADDRESS) {
      const dadataUrl = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address'
      const getAskDadata = await axios({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': await dadataTokenChanger(),
          'Host': 'suggestions.dadata.ru',
        },
        url: encodeURI(dadataUrl),
        data: {query: msg.text, 'count':10}
      })

      const dadataResponse = getAskDadata?.data?.suggestions[0]?.value
      const dadataResponseFull = getAskDadata?.data?.suggestions[0]?.data
      console.log('DADATA', getAskDadata?.data)


      if (getAskDadata?.data?.suggestions?.length === 0) {

        bot.sendMessage(chatId, templates.cantFindObject, {
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
        return
      }

      try {
        bot.sendMessage(chatId, templates.justSearch)
        const url = `https://lk.rosreestr.ru/account-back/address/search?term=${dadataResponse}`
        const encodedUrl = encodeURI(url)

        const askReestrAboutObject = await axios({
          rejectUnauthorized: false,
          headers: {
              'Access-Control-Allow-Origin': '*',
            },
            method: 'GET',
            timeout: 1000 * 10,
            url: encodedUrl
          })

        const html = askReestrAboutObject.data

        if (html.length === 0) {
          bot.sendMessage(chatId, templates.cantFindObject, {
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

        //если найден один объект
        if (html.length === 1) {
          bot.sendMessage(chatId, templates.findOneObject)
          const egrp = getApiUrl(html[0].cadnum)
          const api = getScrapUrl(html[0].cadnum)
          axios.get(api).then(({ data }) => {
            userStates = { ...userStates, [msg.from.id]: { ...userStates[msg.from.id], currentStep: USER_STATES.READY_TO_PAY, cadastrNumber: data.response.objectCn } }
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

      // если найдено несколько объектов
        if (html.length > 1) {
          bot.sendMessage(chatId, templates.findSomeObjects)
          const objectList = html.slice(0,10)
          objectList.map((it) => {
            bot.sendMessage(chatId, answerInformationEgrn1(it), {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{
                    text: 'Подробнее',
                    callback_data: 'kadnum'
                  }],
                  [{
                    text: `🔍 ${templates.backSearch}`,
                    callback_data: `startSearchAgain`
                  }]
                ]
              }
            })
          })
        }
      } catch {
        try {
          const kladrObjectCode = dadataResponseFull?.settlement_kladr_id || dadataResponseFull?.city_kladr_id
          const kladrCode = parseInt(kladrObjectCode)
          const region = dadataResponseFull?.region_with_type
          const settlementName = dadataResponseFull?.settlement || null
          const city = dadataResponseFull?.city || null
          const street = dadataResponseFull?.street || null
          const house = dadataResponseFull?.house || null
          const block = dadataResponseFull?.block || null
          const flat = dadataResponseFull?.flat || null

            async function tryFindFlatList(regionId) {
              // const ReestrUrl = `https://rosreestr.gov.ru/fir_rest/api/fir/address/fir_objects?macroRegionId=${regionId}&street=${street}&house=${houseNumber}&building=${block}`
              let ReestrUrl = `https://rosreestr.gov.ru/fir_lite_rest/api/gkn/address/fir_objects?macroRegionId=${regionId}&street=${street}&house=${house}$&building=${block}&apartment=${flat}}`
              if (!block && !flat) {
                ReestrUrl = `https://rosreestr.gov.ru/fir_lite_rest/api/gkn/address/fir_objects?macroRegionId=${regionId}&street=${street}&house=${house}}`
              }
              const flatList = await axios({
                rejectUnauthorized: false,
                method: 'GET',
                timeout: 1000 * 15,
                url: encodeURI(ReestrUrl),
              })
              if (Array.isArray(flatList.data)) {
                if (flatList.data.length === 0) {
                  bot.sendMessage(chatId, templates.cantFindObject, {
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

                //если найден один объект
                if (flatList.data.length === 1) {
                  bot.sendMessage(chatId, templates.findOneObject)
                  const egrp = getApiUrl(flatList.data[0].objectCn)
                  const api = getScrapUrl(flatList.data[0].objectCn)
                  axios.get(api).then(({ data }) => {
                    userStates = { ...userStates, [msg.from.id]: { ...userStates[msg.from.id], currentStep: USER_STATES.READY_TO_PAY, cadastrNumber: data.response.objectCn } }
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

              // если найдено несколько объектов
                if (flatList.data.length > 1) {
                  bot.sendMessage(chatId, templates.findSomeObjects)
                  const objectList = flatList.data.slice(0,10)
                  objectList.map((it) => {
                    bot.sendMessage(chatId, answerInformationEgrn1(it), {
                      parse_mode: 'HTML',
                      reply_markup: {
                        inline_keyboard: [
                          [{
                            text: 'Подробнее',
                            callback_data: 'kadnum'
                          }],
                          [{
                            text: `🔍 ${templates.backSearch}`,
                            callback_data: `startSearchAgain`
                          }]
                        ]
                      }
                    })
                  })
                }
                return
              }
              return []
            }
              //Если регион - Москва
            if (kladrCode === 7700000000000) {
              const region = 145000000000
              tryFindFlatList(region)
            }
            //Если регион - Питер
            if (kladrCode === 7800000000000) {
              const region = 140000000000
              tryFindFlatList(region)
            }
            // Любой другой регион
            await client.connect()
            const db = client.db(process.env.MONGO_COLLECTION)
            const collection = db.collection('Reestr_geo')
            let settlement = await collection.findOne({ $and:[{settlement_code: kladrCode}, {settlement_name: settlementName || city}]})
            if (!settlement) {
              const settlement1 = await collection.findOne({ $and:[{settlement_code: kladrCode}, {settlement_name: settlementName?.toUpperCase() || city?.toUpperCase()}]})
              settlement = settlement1
            }

            const macroRegionId = settlement?.macroRegionId
            const regionId = settlement?.regionId
            // const askReestrUrl = `https://rosreestr.gov.ru/fir_rest/api/fir/address/fir_objects?macroRegionId=${macroRegionId}&regionId=${regionId}&street=${street}&house=${houseNumber}&building=${block}`
            let askReestrUrl = `https://rosreestr.gov.ru/fir_lite_rest/api/gkn/address/fir_objects?macroRegionId=${macroRegionId}&regionId=${regionId}&street=${street}&house=${house}&building=${block}&apartment=${flat}`
            if (!block && !flat) {
              askReestrUrl = `https://rosreestr.gov.ru/fir_lite_rest/api/gkn/address/fir_objects?macroRegionId=${macroRegionId}&regionId=${regionId}&street=${street}&house=${house}`
            }

            const flatList = await axios({
              rejectUnauthorized: false,
              method: 'GET',
              timeout: 1000 * 15,
              url: encodeURI(askReestrUrl),
            })

            if (Array.isArray(flatList.data)) {
              if (flatList.data.length === 0) {
                bot.sendMessage(chatId, templates.cantFindObject, {
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

              //если найден один объект
              if (flatList.data.length === 1) {
                bot.sendMessage(chatId, templates.findOneObject)
                const egrp = getApiUrl(flatList.data[0].objectCn)
                const api = getScrapUrl(flatList.data[0].objectCn)
                axios.get(api).then(({ data }) => {
                  userStates = { ...userStates, [msg.from.id]: { ...userStates[msg.from.id], currentStep: USER_STATES.READY_TO_PAY, cadastrNumber: data.response.objectCn } }
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

            // если найдено несколько объектов
              if (flatList.data.length > 1) {
                bot.sendMessage(chatId, templates.findSomeObjects)
                const objectList = flatList.data.slice(0,10)
                objectList.map((it) => {
                  bot.sendMessage(chatId, answerInformationEgrn1(it), {
                    parse_mode: 'HTML',
                    reply_markup: {
                      inline_keyboard: [
                        [{
                          text: 'Подробнее',
                          callback_data: 'kadnum'
                        }],
                        [{
                          text: `🔍 ${templates.backSearch}`,
                          callback_data: `startSearchAgain`
                        }]
                      ]
                    }
                  })
                })
              }
              return
            }
        } catch (error) {
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
        return
      }
    }

    if (!currentUserState?.currentStep || !currentUserState) {
      bot.sendMessage(chatId, abraCadabraEnter, {
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
  console.log('QUERRY', query.data)
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
      const clearObject = {}
      userStates = {...clearObject}
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
        bot.sendMessage(query.message.chat.id, answerInformationEgrn(data), keyboard.cb)
      })
      return;

    }

    else {
      const clientId = query?.from?.id
      client.connect()
      const db = client.db(process.env.MONGO_COLLECTION)
      const collection = db.collection('botClients')
      collection.findOne({clientTelegrammId: clientId}).then((response) => {
        const id = response?.clientTelegrammId
        if (id && id === clientId) {
          userStates = { ...userStates, [query.from.id]: { ...userStates[query.from.id], currentStep: USER_STATES.READY_TO_PAY, info: query.data }}
          let document = query?.data?.split(',')[0]
          let price = query?.data?.split(',')[1]
          let fulPrice = price?.trim()
          const email = response?.clientMail
          const cadastrNumber = query?.message?.text.split('\n')[0].split(' ')[2]


          const merchantLogin = 'goskadastr'
          const data = new Date()
          const daynow = data.getDate()
          const orderNumber = Date.now()
          const orderCreate = orderNumber.toString().split('').slice(7).join('')
          const order = `${daynow}${orderCreate}`


          const signatureValue = md5(`${merchantLogin}:${fulPrice}:${order}:jkhfg8d1983`)

          function renameRaports(objectData) {
            if (objectData ==='oh') {
              return ['Отчет об основных характеристиках']
            } else if (objectData ==='op') {
              return ['Отчет о переходе прав']
            } else if (objectData === 'ks') {
              return ['Справка о кадастровой стоимости']
            } else if (objectData === 'ss') {
              return ['Сведения о собственниках']
            }
          }

          const fullOrder = {
            email,
            orderNumber : order,
            cadastrNumber,
            kindOfRaports: renameRaports(document),
            summa: fulPrice
          }


         axios({
            method: 'POST',
            url: 'https://goskadastr.su/api/addOrder',
            data: fullOrder
          }).then(({ data }) => console.log('DATA', data))

          bot.sendMessage(query.message.chat.id, `${templates.isReadyGoToPay} <b>${cadastrNumber}</b>`, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard:
                [
                  [{
                    text: `💳 ${templates.goToPay}`,
                    url: `https://auth.robokassa.ru/Merchant/Index.aspx?MerchantLogin=${merchantLogin}&OutSum=${fulPrice}&InvoiceID=${order}&Description=${order}&SignatureValue=${signatureValue}`
                  }],
                  [{
                    text: `🔍 ${templates.backSearch}`,
                    callback_data: `startSearchAgain`
                  }]
                ]
            }
          })
        } else {
          userStates = { ...userStates, [query.from.id]: { ...userStates[query.from.id], currentStep: USER_STATES.CHOOSE_DOCUMENT, info: query.data } }
          bot.sendMessage(query.message.chat.id, templates.mailText)
        }
      })

    }
})

bot.on("polling_error", console.log);




