'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    return queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION update_loves_stories()
    RETURNS TRIGGER AS $$
    BEGIN
      IF (TG_OP = 'INSERT') THEN -- INSERT operations
          UPDATE story_engagement SET loves = loves + 1 WHERE "contentId"=NEW."contentId";
          RETURN NEW;
      ELSEIF (TG_OP = 'DELETE') THEN -- DELETE operations
          UPDATE story_engagement SET loves = loves - 1 WHERE "contentId"=OLD."contentId";
          RETURN OLD;
      END IF;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS update_loves_stories
		ON story_user_engagement;
    
    CREATE TRIGGER update_loves_stories
    BEFORE INSERT OR DELETE
    ON story_user_engagement
    FOR EACH ROW
    EXECUTE PROCEDURE update_loves_stories();`);
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
