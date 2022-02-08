'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('exchangerates');
        await queryInterface.createTable('exchangerates', {
            currency: {
                type: Sequelize.STRING(5),
                primaryKey: true,
                unique: true,
                allowNull: false
            },
            rate: {
                type: Sequelize.FLOAT,
                allowNull: false
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });
        const staticRates = {
            "FJD": "2.14005",
            "MXN": "21.1973",
            "STD": "21004.453008",
            "LVL": "0.656261",
            "SCR": "18.310362",
            "CDF": "1961.902566",
            "BBD": "2.0",
            "GTQ": "7.77986",
            "CLP": "787.600059",
            "HNL": "24.52222",
            "UGX": "3742.051613",
            "ZAR": "16.5256",
            "TND": "2.75375",
            "CUC": "1.000251",
            "BSD": "1.0",
            "SLL": "9964.999985",
            "SDG": "55.325",
            "IQD": "1192.274567",
            "CUP": "26.5",
            "GMD": "51.75",
            "TWD": "28.722401",
            "RSD": "99.795",
            "DOP": "58.401352",
            "KMF": "420.200165",
            "BCH": "0.004000800160032006",
            "MYR": "4.1469",
            "FKP": "0.772211",
            "XOF": "557.383703",
            "GEL": "3.23",
            "BTC": "0.00008506627513495764",
            "UYU": "42.905799",
            "MAD": "9.195733",
            "CVE": "94.5",
            "TOP": "2.32028",
            "AZN": "1.7025",
            "OMR": "0.385019",
            "PGK": "3.500303",
            "KES": "108.76",
            "SEK": "8.83256",
            "BTN": "73.310305",
            "UAH": "28.367064",
            "GNF": "9793.841933",
            "ERN": "15.000011",
            "MZN": "72.932006",
            "SVC": "8.749931",
            "ARS": "77.586887",
            "QAR": "3.64125",
            "IRR": "21000.0",
            "MRO": "357.0",
            "XPD": "0.00042609",
            "CNY": "6.6822",
            "THB": "31.2075",
            "UZS": "10370.657657",
            "XPF": "101.399281",
            "MRU": "38.3745",
            "BDT": "84.793568",
            "LYD": "1.366644",
            "BMD": "1.0",
            "KWD": "0.305874",
            "PHP": "48.557137",
            "XPT": "0.00116416",
            "RUB": "77.6239",
            "PYG": "7025.910041",
            "ISK": "139.01",
            "JMD": "145.667812",
            "COP": "3847.658709",
            "MKD": "52.361423",
            "USD": "1.0",
            "DZD": "128.8851",
            "PAB": "1.0",
            "GGP": "0.772211",
            "SGD": "1.358575",
            "ETB": "37.262056",
            "JEP": "0.772211",
            "ETC": "0.1802288906911778",
            "KGS": "81.248552",
            "SOS": "580.293639",
            "VEF": "248487.642241",
            "VUV": "114.351744",
            "LAK": "9242.583363",
            "ETH": "0.0026356364403094237",
            "BND": "1.35718",
            "ZEC": "0.015561780267662619",
            "ZMK": "5253.075255",
            "XAF": "557.383703",
            "LRD": "195.449977",
            "XAG": "0.0409425",
            "CHF": "0.910558",
            "HRK": "6.4445",
            "ALL": "105.482966",
            "DJF": "178.019198",
            "VES": "452383.343891",
            "ZMW": "20.198524",
            "TZS": "2319.983369",
            "VND": "23174.539236",
            "XAU": "0.00052549",
            "DASH": "0.01335559265442404",
            "AUD": "1.418038",
            "ILS": "3.38517",
            "GHS": "5.815997",
            "GYD": "209.082964",
            "KPW": "900.062",
            "BOB": "6.904874",
            "KHR": "4104.343882",
            "MDL": "16.917706",
            "IDR": "14704.345",
            "KYD": "0.833344",
            "XRP": "4.067520846044336",
            "AMD": "481.616228",
            "BWP": "11.441537",
            "SHP": "0.772211",
            "TRY": "7.8804",
            "LBP": "1513.784935",
            "TJS": "10.320009",
            "JOD": "0.709",
            "AED": "3.6732",
            "HKD": "7.75004",
            "RWF": "977.144834",
            "EUR": "0.849726",
            "LSL": "16.492502",
            "DKK": "6.3237",
            "CAD": "1.31897",
            "BGN": "1.6618",
            "MMK": "1290.977244",
            "MUR": "39.904847",
            "NOK": "9.33868",
            "SYP": "1257.5",
            "IMP": "0.772211",
            "GIP": "0.772211",
            "RON": "4.143",
            "LKR": "184.400719",
            "NGN": "382.000539",
            "CRC": "603.282392",
            "CZK": "23.165",
            "PKR": "162.488328",
            "XCD": "2.70255",
            "ANG": "1.795012",
            "HTG": "62.998803",
            "LTC": "0.020828993959591754",
            "BHD": "0.377076",
            "KZT": "428.143335",
            "SRD": "14.154",
            "SZL": "16.478311",
            "LTL": "3.224845",
            "SAR": "3.751377",
            "TTD": "6.786748",
            "YER": "250.349961",
            "MVR": "15.4",
            "AFN": "76.850004",
            "INR": "73.3973",
            "AWG": "1.8",
            "KRW": "1139.888901",
            "NPR": "117.296182",
            "JPY": "105.4635",
            "MNT": "2837.967096",
            "AOA": "651.385",
            "PLN": "3.88734",
            "GBP": "0.772211",
            "SBD": "8.08084",
            "BYN": "2.562878",
            "HUF": "310.112446",
            "XLM": "11.743636417016528",
            "BYR": "25628.78",
            "BIF": "1935.070141",
            "MWK": "754.813643",
            "MGA": "3929.504924",
            "XDR": "0.708518",
            "EOS": "0.38744672607516467",
            "BZD": "2.015646",
            "BAM": "1.662153",
            "EGP": "15.7025",
            "MOP": "7.98263",
            "NAD": "16.54",
            "NIO": "34.801582",
            "PEN": "3.587146",
            "NZD": "1.517244",
            "WST": "2.622686",
            "TMT": "3.5",
            "BRL": "5.6071"
        }
        const ratesArray = [];
        for (const currency in staticRates) {
            const rate = staticRates[currency];
            ratesArray.push({
                currency,
                rate,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
        return queryInterface.bulkInsert('exchangerates', ratesArray);
    },
    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('exchangerates');
    }
};