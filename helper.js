require('dotenv').config()
const apiToken = process.env.API_KEY
module.exports = {
    startText: function startText() {
        return `Здравствуйте. Для поиска объекта, нажмите <b>найти объект</b>`
      },
    answerInformationEgrn: function answerInformationEgrn(objectData) {
        // todo : деструкуризация 58 - 61стр
        let kadnum = objectData.response.objectCn
        let parcelStatus = objectData.response.parcelStatus
        let objectName = objectData.response.objectName
        let addressNote = objectData.response.addressNote
        let areaType = `${objectData.response.areaValue}${objectData.response.areaUnit}`
        let cadCost = `${objectData.response.cadCost}${objectData.response.cadUnit}`
        function checkAdress() {
          if (typeof addressNote === 'undefined') {
            return 'нет данных'
          } else {
            return addressNote
          }
        }
        let adress = checkAdress()
        let res = [
          `<b>Кадастровый номер</b>: ${kadnum}`,
          `<b>Адрес объекта:</b> ${adress}`,
          `<b>Тип объекта:</b> ${objectName}`,
          `<b>${objectData.response.areaType}:</b> ${areaType}`,
          `<b>Кадастровая стоимость:</b> ${cadCost}`
        ]
      
        return res.join('\n')
      },
      getApiUrl: (cn) => `https://regrn.su/api/request?req=right&cn=${cn}&version=2.0&format=json&api-key=${apiToken}`,
      getScrapUrl: (cn) => `https://regrn.su/api/request?req=specification&cn=${cn}&version=2.0&format=json&api-key=${apiToken}`,
      getEgrpMessage: (data, dataMessage) => {
        function searchOwners() {
          let numberOfOwners = JSON.stringify(data.response.right)
          if (numberOfOwners.match(/"rightdata":"not found"/g) === null) {
            return Object.keys(data.response.right).length
          }
          else {
            return 'Нет данных'
          }
      
        }
        let owners = searchOwners()
        // let firstOwner = data.response.right['0'].rightdata
        function restrictionResult() {
          let restriction = JSON.stringify(data.response.right).match(/"encumbrances":"not found"/g)
          if (restriction === null) {
            return '‼ Возможно, на объект наложены ограничения'
          }
          else {
            return '✅ Ограничений не найдено'
          }
      
        }
        let resultRestriction = restrictionResult()
        let result = [
          dataMessage,
          `<b>Количество собственников:</b> ${owners}`,
          resultRestriction
        ]
        return result.join('\n')
      },
      OPERATIONS_ACTIONS: {
        "/start": (msg) => {
          const chatId = msg.chat.id;
          const htmlText = `Для поиска объекта, введите кадастровый номер или адрес объекта недвижимости.
          Например: <b>77:01:0001011:1002</b>
          или
          <b>Москва, Тверская, пл. Красная, д.5</b>`;
          bot.sendMessage(chatId, htmlText, {
            parse_mode: 'HTML',
            reply_markup: {
              keyboard: [
                [`📝 ${OPERATIONS.REPORT_TYPES}`, `📄 ${OPERATIONS.SERVICE_DESCRIPTOINS}`],
                [`🔍 ${OPERATIONS.FIND_OBJECT}`]
              ]
            }
          })
          return true
        }
      }
}