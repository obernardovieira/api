import { DbModels } from '../../../database/db';
import { Sequelize } from 'sequelize';

export function learnAndEarnAssociation(sequelize: Sequelize) {
    const {
        learnAndEarnCategory,
        learnAndEarnLesson,
        learnAndEarnLevel,
        learnAndEarnUserLevel,
        learnAndEarnUserLesson,
        learnAndEarnPrismicLevel,
        learnAndEarnPrismicLesson,
    } = sequelize.models as DbModels;

    learnAndEarnLevel.hasMany(learnAndEarnUserLevel, {
        foreignKey: 'levelId',
        sourceKey: 'id',
        as: 'userLevel',
    });

    learnAndEarnPrismicLevel.hasMany(learnAndEarnUserLevel, {
        foreignKey: 'levelId',
        sourceKey: 'levelId',
        as: 'userLevel',
    });

    learnAndEarnPrismicLevel.hasMany(learnAndEarnPrismicLesson, {
        foreignKey: 'levelId',
        sourceKey: 'levelId',
        as: 'lesson',
    });

    learnAndEarnPrismicLesson.hasMany(learnAndEarnUserLesson, {
        foreignKey: 'levelId',
        sourceKey: 'levelId',
        as: 'userLesson',
    });

    learnAndEarnLesson.hasMany(learnAndEarnUserLesson, {
        foreignKey: 'lessonId',
        sourceKey: 'id',
        as: 'userLesson',
    });

    learnAndEarnUserLesson.belongsTo(learnAndEarnLesson, {
        foreignKey: 'lessonId',
        as: 'lesson',
    });

    learnAndEarnLevel.hasMany(learnAndEarnLesson, {
        foreignKey: 'levelId',
        as: 'lesson',
    });

    learnAndEarnLevel.belongsTo(learnAndEarnCategory, {
        foreignKey: 'categoryId',
        as: 'category',
    });
}
