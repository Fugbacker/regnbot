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
      getApiUrl: (cn) => `https://rosegrn.su/api/request?req=right&cn=${cn}&version=2.0&format=json&api-key=${apiToken}`,
      getScrapUrl: (cn) => `https://rosegrn.su/api/request?req=specification&cn=${cn}&version=2.0&format=json&api-key=${apiToken}`,
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
        let dadataToken = 'Token 431c3958f002f6f546afe128257059d372093aa2'
        const tokenList = [
          'Token 431c3958f002f6f546afe128257059d372093aa2',
          'Token 1a86eedfc8da905b34669e441476d13d8ccc4691',
          'Token 0d5ab8f4aabc1cc02c29b2d759e0ebde7254a4b7',
          'Token 3ed91c052b049be7c81567f637a421153fd2a893',
          'Token 70b8dda637580dd14625d9296f24945f2a6fc4f9',
          'Token cc6c5060a102fea6d7e9fca62b723140b71fe26d',
          'Token b34e052b0d7e9ee8ee4bed6e9b6c37f65c6bf19d',
          'Token d96100ae95f29bf1e836953ab1d8806f699b32bd'
         ]

         const now = new Date();
         const day = now.getDate();
         try {
          const response = await axios("https://dadata.ru/api/v2/findById", {
            headers: {
              Authorization: `Bearer ${dadataToken}`,
            },
          });


          if (response.data.response.status === 403) {
            // Токен исчерпал лимит запросов
            const tokenIndex = tokenList.indexOf(token)
            dadataToken = tokenList[tokenIndex+1];
          }
         } catch {
          dadataToken = dadataToken
         }



        // Если наступили новые сутки, начинаем работу с первого в списке токена
        if (day !== now.getDate()) {
          dadataToken = 'Token 431c3958f002f6f546afe128257059d372093aa2'
          console.log('refresh token')
        }
       return dadataToken
      }
}