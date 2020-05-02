import { Sequelize, Options } from 'sequelize';
import config from '../config';
import initModels from '../models';


export default async (): Promise<Sequelize> => {
    const dbConfig: Options = {
        dialect: 'postgres',
        protocol: 'postgres',
        native: true,
    };
    const sequelize = new Sequelize(config.dbUrl, dbConfig);
    await sequelize.authenticate();
    initModels(sequelize);
    return sequelize;
};