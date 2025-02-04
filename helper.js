require('dotenv').config()
const { default: axios } = require('axios')
const apiToken = process.env.API_KEY
module.exports = {

    startText: function startText() {
        return `Здравствуйте. Для поиска объекта, нажмите <b>найти объект</b>`
      },
    answerInformationEgrn: function answerInformationEgrn(objectData) {
      console.log('objectData', objectData)
        // todo : деструкуризация 58 - 61стр
        let kadnum = objectData?.features[0]?.properties?.options?.cad_number || objectData?.features[0]?.properties?.options?.cad_num || objectData?.features[1]?.properties?.options?.cad_number || objectData?.features[1]?.properties?.options?.cad_num || 'не заполнено'
        let objectName = objectData?.features[0]?.properties?.options?.params_type || objectData?.features[0]?.properties?.options?.building_name || objectData?.features[1]?.properties?.options?.building_name || 'не заполнено'
        let addressNote = objectData?.properties?.options?.readable_address || objectData?.result?.object?.address || objectData?.elements?.[0]?.address?.readableAddress || objectData?.features[0]?.properties?.options?.readable_address || objectData?.features[1]?.properties?.options?.readable_address || 'не заполнено'
        let areaType = objectData?.features[0]?.properties?.options?.type || objectData?.features[0]?.properties?.options?.land_record_type || objectData?.features[1]?.properties?.options?.type || objectData?.features[1]?.properties?.options?.land_record_type || 'Объект'
        let cadCost = objectData?.features[0]?.properties?.options?.cost_value || objectData?.features[1]?.properties?.options?.cost_value || 'не заполнено'
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
          `<b>Название объекта:</b> ${objectName}` || 'Объект',
          `<b>Тип объекта:</b> ${areaType}`,
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
      // getApiUrl: (cn) => `https://regrn.store/api/request?req=right&cn=${cn}&version=2.0&format=json&api-key=${apiToken}`,
      // getScrapUrl: (cn) => `https://regrn.store/api/request?req=specification&cn=${cn}&version=2.0&format=json&api-key=${apiToken}`,
     getScrapUrl: (cn) => `https://doc.gockadastr.su/api/partner?cadNumber=${cn}`,

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
       const {data} = await axios('https://gockadastr.su/api/token')
       return data
      }
}