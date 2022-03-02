import { gql } from 'apollo-boost';
import { ethers } from 'ethers';

import config from '../../config';
import { client } from '../config';

export const getCommunityProposal = async (): Promise<string[]> => {
    try {
        const provider = new ethers.providers.JsonRpcProvider(
            config.jsonRpcUrl
        );
        const blockNumber = await provider.getBlockNumber();

        const query = gql`
            {
                communityProposalEntities(
                    where: {
                        status: 0
                        endBlock_gt: ${blockNumber}
                    }
                ) {
                    calldata
                }
            }
        `;

        const queryResult = await client.query({
            query,
        });

        if (queryResult.data?.communityProposalEntities?.length) {
            return queryResult.data.communityProposalEntities.map(
                (proposal) => proposal.calldata
            );
        }

        return [];
    } catch (error) {
        throw new Error(error);
    }
};

export const getClaimed = async (
    ids: string[]
): Promise<
    {
        claimed: string;
        id: string;
    }[]
> => {
    try {
        const idsFormated = ids.map((el) => `"${el.toLocaleLowerCase()}"`);

        const query = gql`
            {
                communityEntities(
                    first: ${idsFormated.length}
                    where: {
                        id_in:[${idsFormated}]
                    }
                ) {
                    id
                    claimed
                }
            }
        `;

        const queryResult = await client.query({
            query,
        });

        return queryResult.data.communityEntities;
    } catch (error) {
        throw new Error(error);
    }
};

export const getCommunityState = async (
    communityAddress: string
): Promise<{
    claims: number;
    claimed: string;
    beneficiaries: number;
    removedBeneficiaries: number;
    contributed: string;
    contributors: number;
    managers: number;
}> => {
    try {
        const query = gql`
            {
                communityEntity(
                    id: "${communityAddress.toLowerCase()}"
                ) {
                    claims
                    claimed
                    beneficiaries
                    removedBeneficiaries
                    contributed
                    contributors
                    managers
                }
            }
        `;

        const queryResult = await client.query({
            query,
        });

        return queryResult.data?.communityEntity;
    } catch (error) {
        throw new Error(error);
    }
};

export const getUserRoles = async (
    address: string
): Promise<{
    beneficiary: { community: string; state: number } | null;
    manager: { community: string; state: number } | null;
}> => {
    try {
        const query = gql`
            {
                beneficiaryEntity(
                    id: "${address.toLowerCase()}"
                ) {
                    community {
                        id
                    }
                    state
                }
                managerEntity(
                    id: "${address.toLowerCase()}"
                ) {
                    community {
                        id
                    }
                    state
                }
            }
        `;

        const queryResult = await client.query({
            query,
        });

        const beneficiary =
            queryResult.data.beneficiaryEntity === null
                ? null
                : {
                      community:
                          queryResult.data?.beneficiaryEntity?.community?.id,
                      state: queryResult.data?.beneficiaryEntity?.state,
                  };

        const manager =
            queryResult.data.managerEntity === null
                ? null
                : {
                      community: queryResult.data.managerEntity?.community?.id,
                      state: queryResult.data.managerEntity?.state,
                  };

        return {
            beneficiary,
            manager,
        };
    } catch (error) {
        throw new Error(error);
    }
};
