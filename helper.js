require('dotenv').config()
const { default: axios } = require('axios')
const apiToken = process.env.API_KEY
module.exports = {

    startText: function startText() {
        return `Здравствуйте. Для поиска объекта, нажмите <b>найти объект</b>`
      },
    answerInformationEgrn: function answerInformationEgrn(objectData) {
        // todo : деструкуризация 58 - 61стр
        let kadnum = objectData?.response?.objectCn
        let objectName = objectData?.response?.objectName
        let addressNote = objectData?.response?.addressNote
        let areaType = `${objectData?.response?.areaValue}${objectData?.response?.areaUnit}`
        let cadCost = `${objectData?.response?.cadCost}${objectData?.response?.cadUnit}`
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
          `<b>${objectData?.response?.areaType}:</b> ${areaType}`,
          `<b>Кадастровая стоимость:</b> ${cadCost}`
        ]

        return res.join('\n')
      },
      answerInformationEgrn1: function answerInformationEgrn1(objectData) {
        let kadnum = objectData?.cadnum || objectData?.objectCn
        let addressNote = objectData?.full_name || objectData?.addressNotes

        let res = [
          `<b>Кадастровый номер</b>: ${kadnum}`,
          `<b>Адрес объекта:</b> ${addressNote}`,
        ]

        return res.join('\n')
      },
      getApiUrl: (cn) => `https://regrn.su/api/request?req=right&cn=${cn}&version=2.0&format=json&api-key=${apiToken}`,
      getScrapUrl: (cn) => `https://regrn.su/api/request?req=specification&cn=${cn}&version=2.0&format=json&api-key=${apiToken}`,
      getEgrpMessage: (data, dataMessage) => {
        function searchOwners() {
          if (data.response !== undefined) {
          let numberOfOwners = Object.keys(data.response.right).length
          if (numberOfOwners) {
            return Object.keys(data.response.right).length
          }
          else {
            return 'нет данных'
          }
        }
        }
        let owners = searchOwners()
        // let firstOwner = data.response.right['0'].rightdata
        function restrictionResult() {
          let restriction = JSON.stringify(data?.response?.right)?.match(/"encumbrances":"not found"/g) || null
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
      dadataTokenChanger: async function dadataTokenChanger () {
       const {data} = await axios('https://goskadastr.su/api/token')
       console.log("TOKEN", data)
       return data
      }
}