import {
    axiosCouncilSubgraph,
    axiosMicrocreditSubgraph,
    axiosSubgraph,
} from '../config';
import { redisClient } from '../../database';
import { intervalsInSeconds } from '../../types';

export type UserRoles = {
    beneficiary: { community: string; state: number; address: string } | null;
    manager: { community: string; state: number } | null;
    councilMember: { state: number } | null;
    ambassador: { communities: string[]; state: number } | null;
    loanManager: { state: number } | null;
};

type DAOResponse = {
    beneficiaryEntity: {
        address: string;
        community: {
            id: string;
        };
        state: number;
    };
    managerEntity: {
        community: {
            id: string;
        };
        state: number;
    };
};
type CouncilMemberResponse = {
    impactMarketCouncilMemberEntity: {
        status: number;
    };
    ambassadorEntity: {
        status: number;
        communities: string[];
    };
};
type MicroCreditResponse = {
    loanManager: {
        state: number;
    };
};

export const getUserRoles = async (address: string): Promise<UserRoles> => {
    try {
        const graphqlQuery = {
            operationName: 'beneficiaryEntity',
            query: `query beneficiaryEntity {
                beneficiaryEntity(
                    id: "${address.toLowerCase()}"
                ) {
                    address
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
            }`,
        };
        const councilGraphqlQuery = {
            operationName: 'impactMarketCouncilMemberEntity',
            query: `query impactMarketCouncilMemberEntity {
                impactMarketCouncilMemberEntity(
                    id: "${address.toLowerCase()}"
                ) {
                    status
                }
                ambassadorEntity(
                    id: "${address.toLowerCase()}"
                ) {
                    status
                    communities
                }
            }`,
        };
        const microcreditGraphqlQuery = {
            operationName: 'loanManager',
            query: `query loanManager {
                loanManager(
                    id: "${address.toLowerCase()}"
                ) {
                    state
                }
            }`,
        };

        const [cacheDAO, cacheCouncil, microcredit] = await Promise.all([
            redisClient.get(graphqlQuery.query),
            redisClient.get(councilGraphqlQuery.query),
            redisClient.get(microcreditGraphqlQuery.query),
        ]);

        let responseDAO: DAOResponse | null = null;
        let responseCouncilMember: CouncilMemberResponse | null = null;
        let responseMicroCredit: MicroCreditResponse | null = null;

        if (cacheDAO && cacheCouncil && microcredit) {
            responseDAO = JSON.parse(cacheDAO);
            responseCouncilMember = JSON.parse(cacheCouncil);
            responseMicroCredit = JSON.parse(microcredit);
        } else {
            const [
                rawResponseDAO,
                rawResponseCouncilMember,
                rawResponseMicroCredit,
            ] = await Promise.all([
                axiosSubgraph.post<
                    any,
                    {
                        data: {
                            data: DAOResponse;
                        };
                    }
                >('', graphqlQuery),
                axiosCouncilSubgraph.post<
                    any,
                    {
                        data: {
                            data: CouncilMemberResponse;
                        };
                    }
                >('', councilGraphqlQuery),
                axiosMicrocreditSubgraph.post<
                    any,
                    {
                        data: {
                            data: MicroCreditResponse;
                        };
                    }
                >('', microcreditGraphqlQuery),
            ]);

            responseDAO = rawResponseDAO.data?.data;

            redisClient.set(
                graphqlQuery.query,
                JSON.stringify(responseDAO),
                'EX',
                intervalsInSeconds.oneHour
            );

            responseCouncilMember = rawResponseCouncilMember.data?.data;

            redisClient.set(
                councilGraphqlQuery.query,
                JSON.stringify(responseCouncilMember),
                'EX',
                intervalsInSeconds.oneHour
            );

            responseMicroCredit = rawResponseMicroCredit.data?.data;

            redisClient.set(
                microcreditGraphqlQuery.query,
                JSON.stringify(responseMicroCredit),
                'EX',
                intervalsInSeconds.oneHour
            );
        }

        const beneficiary = !responseDAO?.beneficiaryEntity
            ? null
            : {
                community: responseDAO?.beneficiaryEntity?.community?.id,
                state: responseDAO?.beneficiaryEntity?.state,
                address: responseDAO?.beneficiaryEntity?.address,
            };

        const manager = !responseDAO?.managerEntity
            ? null
            : {
                community: responseDAO.managerEntity?.community?.id,
                state: responseDAO.managerEntity?.state,
            };

        const councilMember =
            !responseCouncilMember?.impactMarketCouncilMemberEntity
                ? null
                : {
                    state: responseCouncilMember
                        .impactMarketCouncilMemberEntity.status,
                };

        const ambassador = !responseCouncilMember?.ambassadorEntity
            ? null
            : {
                communities:
                    responseCouncilMember.ambassadorEntity?.communities,
                state: responseCouncilMember.ambassadorEntity?.status,
            };

        const loanManager = !responseMicroCredit?.loanManager
            ? null
            : {
                state: responseMicroCredit.loanManager?.state,
            };
        return {
            beneficiary,
            manager,
            councilMember,
            ambassador,
            loanManager,
        };
    } catch (error) {
        throw new Error(error);
    }
};

export const getUserActivity = async (
    address: string,
    community: string,
    offset?: number,
    limit?: number
): Promise<
    {
        id: string;
        by: string;
        user: string;
        community: {
            id: string;
        };
        activity: string;
        timestamp: number;
    }[]
> => {
    try {
        const graphqlQuery = {
            operationName: 'userActivityEntities',
            query: `query userActivityEntities {
                userActivityEntities(
                    first: ${limit ? limit : 1000}
                    skip: ${offset ? offset : 0}
                    where: {
                        user: "${address.toLowerCase()}"
                        community: "${community.toLowerCase()}"
                    }
                    orderBy: timestamp
                    orderDirection: desc
                ) {
                    id
                    by
                    user
                    community {
                        id
                    }
                    activity
                    timestamp
                }
            }`,
        };
        const cacheResults = await redisClient.get(graphqlQuery.query);

        if (cacheResults) {
            return JSON.parse(cacheResults);
        }

        const response = await axiosCouncilSubgraph.post<
            any,
            {
                data: {
                    data: {
                        userActivityEntities: {
                            id: string;
                            by: string;
                            user: string;
                            community: {
                                id: string;
                            };
                            activity: string;
                            timestamp: number;
                        }[];
                    };
                };
            }
        >('', graphqlQuery);

        const userActivityEntities = response.data?.data.userActivityEntities;

        redisClient.set(
            graphqlQuery.query,
            JSON.stringify(userActivityEntities),
            'EX',
            intervalsInSeconds.halfHour
        );

        return userActivityEntities;
    } catch (error) {
        throw new Error(error);
    }
};
