'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    await queryInterface.removeConstraint('ubi_beneficiary_registry', 'ubi_beneficiary_registry_address_fkey')
    await queryInterface.removeConstraint('ubi_beneficiary_registry', 'ubi_beneficiary_registry_from_fkey')
  },

  down: async (queryInterface, Sequelize) => {}
};
