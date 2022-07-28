import { BigNumber } from 'bignumber.js';
import { Transaction } from 'sequelize';

import config from '../../../config';
import { models, sequelize } from '../../../database';
import { UbiCommunityContract } from '../../../interfaces/ubi/ubiCommunityContract';
import { ICommunityContractParams } from '../../../types';

export default class CommunityContractService {
    public async add(
        communityId: number,
        contractParams: ICommunityContractParams,
        t: Transaction | undefined = undefined
    ): Promise<UbiCommunityContract> {
        let { claimAmount, maxClaim, decreaseStep, baseInterval, incrementInterval } = contractParams;

        return models.ubiCommunityContract.create(
            {
                communityId,
                claimAmount: claimAmount as number,
                maxClaim: maxClaim as number,
                decreaseStep: decreaseStep as number,
                baseInterval,
                incrementInterval,
            },
            { transaction: t }
        );
    }

    public async update(
        communityId: number,
        contractParams: ICommunityContractParams
    ): Promise<boolean> {
        let { claimAmount, maxClaim, decreaseStep, baseInterval, incrementInterval } = contractParams;

        const community = (await models.community.findOne({
            attributes: ['publicId'],
            where: { id: communityId },
        }))!;
        try {
            await sequelize.transaction(async (t) => {
                await models.ubiCommunityContract.update({
                    claimAmount: claimAmount as number,
                    maxClaim: maxClaim as number,
                    decreaseStep: decreaseStep as number,
                    baseInterval,
                    incrementInterval,
                }, {
                    where: { communityId },
                    transaction: t,
                });

                // TODO: migrate
                await models.ubiRequestChangeParams.destroy({
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
}
