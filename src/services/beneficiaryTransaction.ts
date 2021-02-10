import { BeneficiaryTransactionCreationAttributes } from '@models/beneficiaryTransaction';
import { Logger } from '@utils/logger';
import { col, fn, Op } from 'sequelize';

import { models, Sequelize } from '../database';

export default class BeneficiaryTransactionService {
    public static beneficiaryTransaction = models.beneficiaryTransaction;

    public static async add(
        beneficiaryTx: BeneficiaryTransactionCreationAttributes
    ): Promise<void> {
        try {
            await this.beneficiaryTransaction.create(beneficiaryTx);
        } catch (e) {
            if (e.name !== 'SequelizeUniqueConstraintError') {
                Logger.error(
                    'Error inserting new BeneficiaryTransaction. Data = ' +
                        JSON.stringify(beneficiaryTx)
                );
                Logger.error(e);
            }
        }
    }

    public static async getAllByDay(
        date: Date
    ): Promise<{
        reach: string[];
        reachOut: string[];
        volume: string;
        transactions: number;
    }> {
        const uniqueAddressesReached = await this.beneficiaryTransaction.findAll(
            {
                attributes: [[fn('distinct', col('withAddress')), 'addresses']],
                where: { date },
            }
        ); // this is an array, wich can be empty (return no rows)
        const uniqueAddressesReachedOut = await this.beneficiaryTransaction.findAll(
            {
                attributes: [[fn('distinct', col('withAddress')), 'addresses']],
                where: {
                    date,
                    withAddress: {
                        [Op.notIn]: Sequelize.literal(
                            '(select distinct address from beneficiary)'
                        ),
                    },
                },
            }
        ); // this is an array, wich can be empty (return no rows)
        const volumeAndTransactions = (
            await this.beneficiaryTransaction.findAll({
                attributes: [
                    [fn('sum', col('amount')), 'volume'],
                    [fn('count', col('tx')), 'transactions'],
                ],
                where: { date },
            })
        )[0] as any; // this is a single result, that, if there's nothing, the result is zero
        // result is { volume: null, transactions: '0' } if nothing has happened
        console.log(volumeAndTransactions);
        return {
            reach:
                uniqueAddressesReached.length === 0
                    ? []
                    : uniqueAddressesReached.map((a: any) => a.addresses),
            reachOut:
                uniqueAddressesReachedOut.length === 0
                    ? []
                    : uniqueAddressesReachedOut.map((a: any) => a.addresses),
            volume:
                volumeAndTransactions.volume === null
                    ? '0'
                    : volumeAndTransactions.volume,
            transactions: parseInt(volumeAndTransactions.transactions, 10),
        };
    }
}
