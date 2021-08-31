'use strict';

// eslint-disable-next-line no-undef
module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.createTable('ubi_beneficiary_registry', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            address: {
                type: Sequelize.STRING(44),
                // references: {
                //     model: 'user',
                //     key: 'address',
                // },
                // onDelete: 'RESTRICT',
                allowNull: false,
            },
            from: {
                type: Sequelize.STRING(44),
                // references: {
                //     model: 'user',
                //     key: 'address',
                // },
                // onDelete: 'RESTRICT',
                allowNull: false,
            },
            communityId: {
                type: Sequelize.INTEGER,
                references: {
                    model: 'community',
                    key: 'id',
                },
                onDelete: 'CASCADE',
                allowNull: false,
            },
            activity: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            tx: {
                type: Sequelize.STRING(68),
                unique: true,
                allowNull: false,
            },
            txAt: {
                type: Sequelize.DATE,
                allowNull: false,
            },
        });
    },
    down: (queryInterface) => {
        return queryInterface.dropTable('ubi_beneficiary_registry');
    },
};
