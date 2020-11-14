import { col, fn, Op } from 'sequelize';
import { Inflow } from '../db/models/inflow';
import Logger from '../loaders/logger';


export default class InflowService {

    public static async add(
        from: string,
        communityId: string,
        amount: string,
        tx: string,
        txAt: Date,
    ): Promise<void> {
        try {
            await Inflow.create({
                from,
                communityId,
                amount,
                tx,
                txAt,
            });
        } catch(e) {
            Logger.info(e);
        }
    }

    /**
     * Get total monthly (last 30 days, starting todayMidnightTime) raised amounts.
     * 
     * **NOTE**: raised amounts will always be bigger than zero though,
     * a community might not be listed if no raise has ever happened!
     * 
     * @returns string
     */
    public static async getMonthlyRaised(): Promise<string> {
        const todayMidnightTime = new Date(new Date().getTime());
        todayMidnightTime.setHours(0, 0, 0, 0);
        // 30 days ago, from todayMidnightTime
        const aMonthAgo = new Date(todayMidnightTime.getTime() - 2592000000); // 30 * 24 * 60 * 60 * 1000
        const raised = (await Inflow.findAll({
            attributes: [[fn('sum', col('amount')), 'raised']],
            where: {
                txAt: {
                    [Op.lt]: todayMidnightTime,
                    [Op.gte]: aMonthAgo,
                }
            },
        }))[0];
        // there will always be raised.lenght > 0 (were only zero at the begining)
        return (raised as any).raised;
    }

    /**
     * Count unique backers since the begining of the project.
     */
    public static async countEvergreenBackers(): Promise<number> {
        const backers = (await Inflow.findAll({
            attributes: [[fn('count', fn('distinct', col('from'))), 'total']],
        }))[0];
        return (backers as any).total;
    }

    /**
     * Count unique backers and total funded in the last 30 days-
     */
    public static async uniqueBackersAndFundingLast30Days(): Promise<{
        backers: number;
        funding: string;
    }> {
        const todayMidnightTime = new Date(new Date().getTime() - 86400000);
        todayMidnightTime.setHours(0, 0, 0, 0);
        // 30 days ago, from todayMidnightTime
        const aMonthAgo = new Date(todayMidnightTime.getTime() - 2592000000); // 30 * 24 * 60 * 60 * 1000
        const result = (await Inflow.findAll({
            attributes: [
                [fn('count', fn('distinct', col('from'))), 'backers'],
                [fn('sum', col('amount')), 'funding']
            ],
            where: {
                txAt: {
                    [Op.lt]: todayMidnightTime,
                    [Op.gte]: aMonthAgo,
                }
            },
        }))[0];
        return {
            backers: parseInt((result as any).backers),
            funding: (result as any).funding,
        }
    }
}