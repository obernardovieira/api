'use strict';

// eslint-disable-next-line no-undef
module.exports = {
    async up(queryInterface, Sequelize) {
        if (process.env.NODE_ENV === 'test') {
            return;
        }
        await queryInterface.changeColumn('app_user_trust', 'phone', {
            type: Sequelize.STRING(128),
            allowNull: false,
        });
    },

    down(queryInterface, Sequelize) {},
};
