import BigNumber from 'bignumber.js';
import config from '../../config';
import { Transaction } from 'sequelize';

import { models, sequelize } from '../../database';
import { UbiCommunityContract } from '../../interfaces/ubi/ubiCommunityContract';
import { ICommunityContractParams } from '../../types';

export default class CommunityContractService {
    public static ubiCommunityContract = models.ubiCommunityContract;
    public static ubiRequestChangeParams = models.ubiRequestChangeParams;
    public static community = models.community;
    public static sequelize = sequelize;

    public static async add(
        communityId: number,
        contractParams: ICommunityContractParams,
        t: Transaction | undefined = undefined
    ): Promise<UbiCommunityContract> {
        let {
            claimAmount,
            maxClaim,
            baseInterval,
            incrementInterval,
            decreaseStep,
            minTranche,
            maxTranche,
        } = contractParams;

        if (typeof claimAmount === 'string' && claimAmount.length > 10) {
            claimAmount = new BigNumber(claimAmount)
                .dividedBy(10 ** config.cUSDDecimal)
                .toNumber();
        }
        if (typeof maxClaim === 'string' && maxClaim.length > 10) {
            maxClaim = new BigNumber(maxClaim).dividedBy(10 ** config.cUSDDecimal).toNumber();
        }
        if (typeof decreaseStep === 'string' && decreaseStep.length > 10) {
            decreaseStep = new BigNumber(decreaseStep)
                .dividedBy(10 ** config.cUSDDecimal)
                .toNumber();
        }

        return await this.ubiCommunityContract.create(
            {
                communityId,
                claimAmount: claimAmount as number,
                maxClaim: maxClaim as number,
                baseInterval,
                incrementInterval,
                minTranche,
                maxTranche,
                decreaseStep: decreaseStep as number,
            },
            { transaction: t }
        );
    }

    public static async update(
        communityId: number,
        contractParams: ICommunityContractParams
    ): Promise<boolean> {
        let {
            claimAmount,
            maxClaim,
            baseInterval,
            incrementInterval,
            decreaseStep,
            minTranche,
            maxTranche,
        } = contractParams;

        if (typeof claimAmount === 'string' && claimAmount.length > 10) {
            claimAmount = new BigNumber(claimAmount)
                .dividedBy(10 ** config.cUSDDecimal)
                .toNumber();
        }
        if (typeof maxClaim === 'string' && maxClaim.length > 10) {
            maxClaim = new BigNumber(maxClaim).dividedBy(10 ** config.cUSDDecimal).toNumber();
        }
        if (typeof decreaseStep === 'string' && decreaseStep.length > 10) {
            decreaseStep = new BigNumber(decreaseStep)
                .dividedBy(10 ** config.cUSDDecimal)
                .toNumber();
        }

        const community = (await this.community.findOne({
            attributes: ['publicId'],
            where: { id: communityId },
        }))!;
        try {
            await sequelize.transaction(async (t) => {
                await this.ubiCommunityContract.update(
                    {
                        claimAmount: claimAmount as number,
                        maxClaim: maxClaim as number,
                        baseInterval,
                        incrementInterval,
                        minTranche,
                        maxTranche,
                        decreaseStep: decreaseStep as number,
                    },
                    { where: { communityId }, transaction: t }
                );

                // TODO: migrate
                await this.ubiRequestChangeParams.destroy({
                    where: { communityId: community.publicId },
                    transaction: t,
                });
            });
            return true;

            // If the execution reaches this line, the transaction has been committed successfully
            // `result` is whatever was returned from the transaction callback (the `user`, in this case)
        } catch (error) {
            // If the execution reaches this line, an error occurred.
            // The transaction has already been rolled back automatically by Sequelize!
            return false;
        }
    }

    public static async get(
        communityId: string
    ): Promise<ICommunityContractParams> {
        return (await this.ubiCommunityContract.findOne({
            attributes: [
                'claimAmount',
                'maxClaim',
                'baseInterval',
                'incrementInterval',
            ],
            where: { communityId },
            raw: true,
        }))!;
    }

    public static async getAll(): Promise<Map<number, UbiCommunityContract>> {
        return new Map(
            (await this.ubiCommunityContract.findAll({ raw: true })).map(
                (c) => [c.communityId, c]
            )
        );
    }
}
