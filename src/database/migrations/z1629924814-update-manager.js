'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    await queryInterface.removeConstraint('manager', 'manager_address_fkey')
  },

  down: async (queryInterface, Sequelize) => {}
};
