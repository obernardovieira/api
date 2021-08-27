'use strict';

const { pbkdf2Sync } = require('crypto');

// eslint-disable-next-line no-undef
module.exports = {
    async up(queryInterface, Sequelize) {
        if (process.env.NODE_ENV === 'test') {
            return;
        }
        const AppUserTrust = await queryInterface.sequelize.define(
            'app_user_trust',
            {
                id: {
                    type: Sequelize.INTEGER,
                    autoIncrement: true,
                    primaryKey: true,
                },
                phone: {
                    // hashed phone number
                    type: Sequelize.STRING(128),
                    allowNull: false,
                },
                verifiedPhoneNumber: {
                    type: Sequelize.BOOLEAN,
                    defaultValue: false,
                },
                suspect: {
                    type: Sequelize.BOOLEAN,
                    defaultValue: false,
                },
            },
            {
                tableName: 'app_user_trust',
                sequelize: queryInterface.sequelize, // this bit is important
            }
        );

        const trust = await AppUserTrust.findAll({});
        for (let index = 0; index < trust.length; index++) {
            await AppUserTrust.update(
                {
                    phone: pbkdf2Sync(
                        trust[index].phone,
                        process.env.PBKDF2_SALT,
                        100000,
                        64,
                        'sha512'
                    ).toString('hex'),
                },
                { where: { phone: trust[index].phone } }
            );
        }
    },

    down(queryInterface, Sequelize) {},
};
