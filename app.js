require('dotenv').config()
const md5 = require('md5')

const express = require('express')
const app = express()
const PORT = 3001
app.listen(PORT, () => console.log(`My server is running on port ${PORT}`))
const TelegramBot = require('node-telegram-bot-api')
const { default: axios } = require('axios')

const keyboard = require('./keyboard')
const templates = require('./templates')
const {startText, answerInformationEgrn, answerInformationEgrn1, dadataTokenChanger, orderGeneration} = require('./helper')

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
          // const egrp = getApiUrl(msg.text)
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
              // axios.get(egrp).then(({ data }) => {
              //   userStates = {
              //     ...userStates, [msg.from.id]: {
              //       ...userStates[msg.from.id], currentStep: USER_STATES.RECIVED_EGRP,
              //       address: msg.text, egrp: getEgrpMessage(data, dataMessage)
              //     }
              //   }
              //   bot.sendMessage(chatId, userStates[msg.from.id].egrp, keyboard.cb)
              // })
              userStates = {
                ...userStates, [msg.from.id]: {
                  ...userStates[msg.from.id], currentStep: USER_STATES.RECIVED_EGRP,
                  address: msg.text, egrp: dataMessage
                }
              }
              bot.sendMessage(chatId, userStates[msg.from.id].egrp, keyboard.cb)
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

      // const dadataResponse = getAskDadata?.data?.suggestions[0]?.value

      const dadataResponseFull = getAskDadata?.data?.suggestions[0]?.data
      const region = dadataResponseFull?.region_with_type
      const city = dadataResponseFull?.city || null
      const settlement = dadataResponseFull?.settlement || null
      const street = dadataResponseFull?.street || null
      const house = dadataResponseFull?.house || null
      const flat = dadataResponseFull?.flat || null

      let fullAddress = `${region}|${city}|${settlement}|${street}|${house}|${flat}`
      const arrayOfAddresses = fullAddress.split("|").filter(it => it !== 'null')
      const address = arrayOfAddresses.join(' ')

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

      // try {
        bot.sendMessage(chatId, templates.justSearch)
        const url = `https://lk.rosreestr.ru/account-back/address/search?term=${address}`
        const encodedUrl = encodeURI(url)
        console.log('encodedUrl', encodedUrl)
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
        console.log('HTML', html)

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
          console.log('CADNUMBER', html[0].cadnum)
          bot.sendMessage(chatId, templates.findOneObject)
          // const egrp = getApiUrl(html[0].cadnum)
          const api = getScrapUrl(html[0].cadnum)
          axios.get(api).then(({ data }) => {
            console.log('data', data)
            userStates = { ...userStates, [msg.from.id]: { ...userStates[msg.from.id], currentStep: USER_STATES.READY_TO_PAY, cadastrNumber: data?.features[0]?.properties?.options?.cad_number || data?.features[0]?.properties?.options?.cad_num || data?.features[1]?.properties?.options?.cad_number || data?.features[1]?.properties?.options?.cad_num } }
            const dataMessage = answerInformationEgrn(data)
            // axios.get(egrp).then(({ data }) => {
            //   userStates = {
            //     ...userStates, [msg.from.id]: {
            //       ...userStates[msg.from.id], currentStep: USER_STATES.RECIVED_EGRP,
            //     }
            //   }
            //   bot.sendMessage(chatId, getEgrpMessage(data, dataMessage), keyboard.cb)
            // })
            userStates = {
              ...userStates, [msg.from.id]: {
                ...userStates[msg.from.id], currentStep: USER_STATES.RECIVED_EGRP,
                address: msg.text, egrp: dataMessage
              }
            }
            bot.sendMessage(chatId, userStates[msg.from.id].egrp, keyboard.cb)
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
      // } catch {
      //   bot.sendMessage(chatId, templates.cantFindObject, {
      //     parse_mode: 'HTML',
      //     reply_markup: {
      //       inline_keyboard:
      //         [
      //           [{
      //             text: templates.addressSearch,
      //             callback_data: `addressSearch`
      //           }],
      //           [{
      //             text: templates.cadastralSearch,
      //             callback_data: `cadastrSearch`
      //           }]
      //         ]
      //     }
      //   })
      //   return
      // }
    }

    if (currentUserState?.currentStep === USER_STATES.CHOOSE_DOCUMENT) {
      userStates = { ...userStates, [msg.from.id]: { ...userStates[msg.from.id], currentStep: USER_STATES.READY_TO_PAY, mail: msg.text }}
      let document = userStates[msg.from.id].info.split(',')[0]
      let price = userStates[msg.from.id].info.split(',')[1]
      let fulPrice = price?.trim()

      const email = msg?.text
      const cadastrNumber = userStates?.cadastrNumber


      const data = new Date()
      const daynow = data.getDate()
      const ms = Date.now()
      const orderCreate = ms.toString().split('').slice(7).join('')
      const order = `${daynow}${orderCreate}`


      const year = data.getFullYear()
      const month = `0${data.getMonth()+1}`
      const monthReal = month.length > 2 ? month.slice(1) : month
      const day = data.getDate()
      const hour = data.getHours()
      const minutes = data.getMinutes()
      const date = `${day}.${monthReal}.${year} ${hour}:${minutes}`


      await client.connect()
      const db = await client.db(process.env.MONGO_COLLECTION)
      const collection = await db.collection('botClients')
      await collection.insertOne({
        clientTelegrammId: [msg.from.id][0],
        clientMail: email,
        userName: currentUserState?.userName
      })

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
      // const url = await orderGeneration(order, renameRaports(document), email, cadastrNumber, fulPrice, data)

      axios(({
        method:'POST',
        url:'https://api.yookassa.ru/v3/payments',
        headers: {
          'Content-type': 'application/json',
          'Idempotence-key': Date.now()
        },
        auth: {
          username: '411269', //'501627',
          // username: '501627', //'test',
          password: 'live_iWNFBoR460kNVueaehfMWoRL-ah_xgM84A63se2ucIE' //'test_REd92lfdF3-xDVl_6B1C42sxUew5KiFiiQs7f0-qMz8'
          // password: 'test_REd92lfdF3-xDVl_6B1C42sxUew5KiFiiQs7f0-qMz8'
        },
        data: {
          amount: {
            value: fulPrice,
            currency: 'RUB'
          },
          capture: true,
          confirmation: {
            type: 'redirect',
            return_url:`https://doc.gockadastr.su/result/${order}`
          },
          description: order
        }
      }))
      .then(({ data }) => {
        if (data) {
          const fullOrder = {
            date,
            email,
            orderNumber: order,
            cadastrNumber,
            kindOfRaports: renameRaports(document),
            summa: fulPrice,
            sale: false,
            tgBot:true,
            paymentId: data.id
          }

          axios({
            method: 'POST',
            url: 'https://doc.gockadastr.su/api/addOrder',
            data: fullOrder
          })
          const yookassPaymentUrl = data?.confirmation?.confirmation_url
          bot.sendMessage(chatId, `${templates.isReadyGoToPay} <b>${currentUserState.cadastrNumber}</b>`, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard:
                [
                  [{
                    text: `💳 ${templates.goToPay}`,
                    url: `${yookassPaymentUrl}`
                  }],
                  [{
                    text: `🔍 ${templates.backSearch}`,
                    callback_data: `startSearchAgain`
                  }]
                ]
            }
          })
        }
      })
      return
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
      console.log('number', number)
      console.log('api', api)
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

          const data = new Date()
          const daynow = data.getDate()
          const ms = Date.now()
          const orderCreate = ms.toString().split('').slice(7).join('')
          const order = `${daynow}${orderCreate}`

          console.log('ORDERNUMBER', order)
          const year = data.getFullYear()
          const month = `0${data.getMonth()+1}`
          const monthReal = month.length > 2 ? month.slice(1) : month
          const day = data.getDate()
          const hour = data.getHours()
          const minutes = data.getMinutes()
          const date = `${day}.${monthReal}.${year} ${hour}:${minutes}`


          // const signatureValue = md5(`${merchantLogin}:${fulPrice}:${order}:jkhfg8d1983`)

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
          // const url = await orderGeneration(order, renameRaports(document), email, cadastrNumber, fulPrice, data)

          axios(({
            method:'POST',
            url:'https://api.yookassa.ru/v3/payments',
            headers: {
              'Content-type': 'application/json',
              'Idempotence-key': Date.now()
            },
            auth: {
              username: '411269', //'501627',
              // username: '501627', //'test',
              password: 'live_iWNFBoR460kNVueaehfMWoRL-ah_xgM84A63se2ucIE' //'test_REd92lfdF3-xDVl_6B1C42sxUew5KiFiiQs7f0-qMz8'
              // password: 'test_REd92lfdF3-xDVl_6B1C42sxUew5KiFiiQs7f0-qMz8'
            },

            data: {
              amount: {
                value: fulPrice,
                currency: 'RUB'
              },
              capture: true,
              confirmation: {
                type: 'redirect',
                return_url:`https://doc.gockadastr.su/result/${order}`
              },
              description: order
            }
          }))
          .then(({ data }) => {
            if (data) {
              const fullOrder = {
                date,
                email,
                orderNumber: order,
                cadastrNumber,
                kindOfRaports: renameRaports(document),
                summa: fulPrice,
                sale: false,
                tgBot:true,
                paymentId: data.id
              }

              axios({
                method: 'POST',
                url: 'https://doc.gockadastr.su/api/addOrder',
                data: fullOrder
              })
              const yookassPaymentUrl = data?.confirmation?.confirmation_url
              bot.sendMessage(query.message.chat.id, `${templates.isReadyGoToPay} <b>${cadastrNumber}</b>`, {
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard:
                    [
                      [{
                        text: `💳 ${templates.goToPay}`,
                        url: `${yookassPaymentUrl}`
                      }],
                      [{
                        text: `🔍 ${templates.backSearch}`,
                        callback_data: `startSearchAgain`
                      }]
                    ]
                }
              })
            }
          })
          return
        } else {
          userStates = { ...userStates, [query.from.id]: { ...userStates[query.from.id], currentStep: USER_STATES.CHOOSE_DOCUMENT, info: query.data } }
          bot.sendMessage(query.message.chat.id, templates.mailText)
        }
      })

    }
})

bot.on("polling_error", console.log);




