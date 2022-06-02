import { gql } from 'apollo-boost';

import { clientDAO } from '../config';
import { ManagerSubgraph } from '../interfaces/manager';

export const getCommunityManagers = async (
    communityAddress: string,
    state?: string,
    addresses?: string[],
    orderBy?: string,
    orderDirection?: string,
    limit?: number,
    offset?: number
): Promise<ManagerSubgraph[]> => {
    try {
        const idsFormated = addresses?.map(
            (el) => `"${el.toLocaleLowerCase()}"`
        );
        const query = gql`
            {
                managerEntities(
                    ${limit ? `first: ${limit}` : ''}
                    ${offset ? `skip: ${offset}` : ''}
                    ${orderBy ? orderBy : ''}
                    ${orderDirection ? orderDirection : ''}
                    where: {
                        community: "${communityAddress.toLowerCase()}"
                        ${state ? state : ''}
                        ${
                            idsFormated && idsFormated.length > 0
                                ? `address_in: [${idsFormated}]`
                                : ''
                        }
                    }
                ) {
                    address
                    state
                    added
                    removed
                    since
                }
            }
        `;

        const queryResult = await clientDAO.query({
            query,
            fetchPolicy: 'no-cache',
        });

        return queryResult.data?.managerEntities;
    } catch (error) {
        throw new Error(error);
    }
};

export const countManagers = async (
    community: string,
    state: string
): Promise<number> => {
    try {
        const query = gql`
                {
                    communityEntity(
                        id: "${community.toLowerCase()}"
                    ) {
                        managers
                        removedManagers
                    }
                }
            `;
        const queryResult = await clientDAO.query({
            query,
            fetchPolicy: 'no-cache',
        });

        if (state === 'active') {
            return queryResult.data.communityEntity.managers;
        } else if (state === 'removed') {
            return queryResult.data.communityEntity.removedManagers;
        } else {
            return (
                queryResult.data.communityEntity.managers +
                queryResult.data.communityEntity.removedManagers
            );
        }
    } catch (error) {
        throw new Error(error);
    }
};