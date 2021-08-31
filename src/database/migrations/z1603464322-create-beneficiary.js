'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('beneficiary', {
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
                // onDelete: 'RESTRICT', // delete only if active = false, separately
                allowNull: false,
            },
            communityId: {
                type: Sequelize.UUID,
                references: {
                    model: 'community',
                    key: 'publicId',
                },
                onDelete: 'RESTRICT',
                allowNull: false,
            },
            active: {
                type: Sequelize.BOOLEAN,
                defaultValue: true,
            },
            blocked: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
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
            claims: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            claimed: {
                type: Sequelize.DECIMAL(22), // max 9,999 - plus 18 decimals
                defaultValue: 0,
            },
            lastClaimAt: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            penultimateClaimAt: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
            },
        });
        return queryInterface.sequelize.query(
            `ALTER TABLE beneficiary ADD CONSTRAINT one_beneficiary_per_community_key UNIQUE (address, "communityId");`
        );
    },
    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('beneficiary');
    },
};
