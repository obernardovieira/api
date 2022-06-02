import { BigNumber } from 'bignumber.js';
import { utils, ethers } from 'ethers';
import { UbiCommunityContract } from '../../../interfaces/ubi/ubiCommunityContract';
import { Op, WhereOptions, fn, col, literal } from 'sequelize';

import config from '../../../config';
import { models } from '../../../database';
import { AppUser } from '../../../interfaces/app/appUser';
import { BeneficiaryAttributes } from '../../../interfaces/ubi/beneficiary';
import { CommunityAttributes } from '../../../interfaces/ubi/community';
import { BeneficiarySubgraph } from '../../../subgraph/interfaces/beneficiary';
import { ManagerSubgraph } from '../../../subgraph/interfaces/manager';
import {
    getBeneficiariesByAddress,
    getBeneficiaries,
    countBeneficiaries,
} from '../../../subgraph/queries/beneficiary';
import {
    getCommunityState,
    getCommunityUBIParams,
} from '../../../subgraph/queries/community';
import {
    getCommunityManagers,
    countManagers,
} from '../../../subgraph/queries/manager';
import { getUserRoles } from '../../../subgraph/queries/user';
import { BaseError } from '../../../utils/baseError';
import { isAddress } from '../../../utils/util';
import { IListBeneficiary, BeneficiaryFilterType } from '../../endpoints';

export class CommunityDetailsService {
    public async getState(communityId: number) {
        const community = await models.community.findOne({
            attributes: ['contractAddress'],
            where: {
                id: communityId,
            },
        });
        if (!community || !community.contractAddress) {
            return null;
        }

        const state = await getCommunityState(community.contractAddress);
        return {
            ...state,
            communityId,
        };
    }

    public async getContract(communityId: number) {
        const result = await models.ubiCommunityContract.findOne({
            where: {
                communityId,
            },
        });

        if (!result) {
            return null;
        }

        const contract = result.toJSON() as UbiCommunityContract;

        return {
            ...contract,
            claimAmount: ethers.utils.formatEther(contract.claimAmount),
            maxClaim: ethers.utils.formatEther(contract.maxClaim),
        };
    }

    public async getAmbassador(communityId: number) {
        const community = await models.community.findOne({
            attributes: ['ambassadorAddress'],
            where: {
                id: communityId
            }
        });

        if (!community || !community.ambassadorAddress) {
            return null;
        }

        const ambassador = await models.appUser.findOne({
            where: {
                address: { [Op.iLike]: community.ambassadorAddress },
            }
        });

        return ambassador;
    }

    public async getUBIParams(communityId: number) {
        const community = await models.community.findOne({
            attributes: ['contractAddress'],
            where: {
                id: communityId,
            },
        });
        if (!community || !community.contractAddress) {
            return null;
        }

        const ubiParams = await getCommunityUBIParams(
            community.contractAddress
        );
        return {
            ...ubiParams,
            communityId,
        };
    }

    /**
     * @swagger
     *  components:
     *    schemas:
     *      getManagersResponse:
     *        type: object
     *        properties:
     *          address:
     *            type: string
     *            description: Manager address
     *          username:
     *            type: string
     *            nullable: true
     *            description: Manager username or null
     *          isDeleted:
     *            type: boolean
     *            description: True if manager deleted account
     *          state:
     *            type: integer
     *            description: Manager state (see subgraph schema for more details)
     *          added:
     *            type: integer
     *            description: Number of beneficiaries added by manager
     *          removed:
     *            type: integer
     *            description: Number of beneficiaries removed by manager
     *          since:
     *            type: integer
     *            description: Unix timestamp of when the manager was added
     */
    public async listManagers(
        communityId: number,
        offset: number,
        limit: number,
        filter: {
            state?: string, 
        },
        searchInput?: string,
        orderBy?: string,
    ): Promise<
        {
            count: number,
            rows: {
                address: string;
                firstName?: string | null;
                lastName?: string | null;
                isDeleted: boolean;
                state?: string;
                added: number;
                removed: number;
                since: number;
            }[]
        }
    > {
        const community = (await models.community.findOne({
            where: {
                id: communityId
            },
        }))!;

        let addresses: string[] = [];
        let appUserFilter: WhereOptions | null = null;
        let managersSubgraph: ManagerSubgraph[] | null = null;
        let appUsers: AppUser[] = [];
        let count: number = 0;
        let orderKey: string | null = null;
        let orderDirection: string | null = null;

        if (orderBy) {
            [orderKey, orderDirection] = orderBy.split(':');
            orderDirection = orderDirection?.toLocaleLowerCase() === 'desc' ? orderDirection : 'asc';
        }

        if (searchInput) {
            if (isAddress(searchInput)) {
                addresses.push(ethers.utils.getAddress(searchInput));
            } else if (
                searchInput.toLowerCase().indexOf('drop') === -1 &&
                searchInput.toLowerCase().indexOf('delete') === -1 &&
                searchInput.toLowerCase().indexOf('update') === -1
            ) {
                appUserFilter = literal(`concat("firstName", ' ', "lastName") ILIKE '%${searchInput}%'`);
            } else {
                throw new BaseError('INVALID_SEARCH', 'Not valid search!');
            }
        }

        if (community.status === 'pending') {
            if (community.requestByAddress !== addresses[0]) {
                return {
                    count: 0,
                    rows: [],
                };
            }
            const user = await models.appUser.findOne({
                attributes: ['address', 'firstName', 'lastName', 'email', 'phone', 'avatarMediaPath'],
                where: {
                    address: community.requestByAddress,
                },
            });
            return {
                count: !!user ? 1 : 0,
                rows: [
                    {
                        ...user as AppUser,
                        isDeleted: false,
                        state: undefined,
                        added: 0,
                        removed: 0,
                        since: 0,
                    },
                ]
            };
        } else {
            if (appUserFilter) {
                // filter by name
                appUsers = await models.appUser.findAll({
                    attributes: ['address', 'firstName', 'lastName', 'email', 'phone', 'avatarMediaPath'],
                    where: {
                        address: appUserFilter,
                    },
                });
                addresses = appUsers.map(user => user.address);
                managersSubgraph = await getCommunityManagers(
                    community.contractAddress!,
                    filter.state === 'active' 
                        ? 'state: 0' 
                        : filter.state === 'removed'
                            ? 'state: 1'
                            : undefined,
                    addresses,
                    orderKey ? `orderBy: ${orderKey}` : undefined,
                    orderDirection ? `orderDirection: ${orderDirection}` : undefined,
                );
                count = managersSubgraph.length;
                if (count > limit) {
                    managersSubgraph = managersSubgraph.slice(offset, offset + limit);
                }
            } else if (addresses.length > 0) {
                // filter by address
                managersSubgraph = await getCommunityManagers(
                    community.contractAddress!,
                    filter.state === 'active' 
                        ? 'state: 0' 
                        : filter.state === 'removed'
                            ? 'state: 1'
                            : undefined,
                    addresses,
                    orderKey ? `orderBy: ${orderKey}` : undefined,
                    orderDirection ? `orderDirection: ${orderDirection}` : undefined,
                );
                count = managersSubgraph.length;
                appUsers = await models.appUser.findAll({
                    attributes: ['address', 'firstName', 'lastName', 'email', 'phone', 'avatarMediaPath'],
                    where: {
                        address: {
                            [Op.in]: addresses,
                        },
                    },
                });
            } else {
                managersSubgraph = await getCommunityManagers(
                    community.contractAddress!,
                    filter.state === 'active' 
                        ? 'state: 0' 
                        : filter.state === 'removed'
                            ? 'state: 1'
                            : undefined,
                    undefined,
                    orderKey ? `orderBy: ${orderKey}` : undefined,
                    orderDirection ? `orderDirection: ${orderDirection}` : undefined,
                    limit,
                    offset,
                );
                count = await countManagers(
                    community.contractAddress!,
                    filter.state ? filter.state : 'all'
                );
                addresses = managersSubgraph.map(manager => ethers.utils.getAddress(manager.address));
                appUsers = await models.appUser.findAll({
                    attributes: ['address', 'firstName', 'lastName', 'email', 'phone', 'avatarMediaPath'],
                    where: {
                        address: {
                            [Op.in]: addresses,
                        },
                    },
                });
            }

            if (!managersSubgraph || !managersSubgraph.length) {
                count = 0;
            }

            const result = managersSubgraph.map(manager => {
                const user = appUsers.find((user) => user.address === ethers.utils.getAddress(manager.address));
                return {
                    address: ethers.utils.getAddress(manager.address),
                    firstName: user?.firstName,
                    lastName: user?.lastName,
                    email: user?.email,
                    phone: user?.phone,
                    avatarMediaPath: user?.avatarMediaPath,
                    added: manager.added,
                    removed: manager.removed,
                    since: manager.since,
                    isDeleted:
                        !user || !!user!.deletedAt,
                    state:
                        manager.state === 0
                            ? 'active'
                            : 'removed'
                }
            });
    
            return {
                count,
                rows: result,
            };
        }
    }

    public async listBeneficiaries(
        managerAddress: string,
        offset: number,
        limit: number,
        filter: BeneficiaryFilterType,
        searchInput?: string,
        orderBy?: string,
    ): Promise<{
        count: number;
        rows: IListBeneficiary[];
    }> {
        const roles = await getUserRoles(managerAddress);
        if (!roles.manager) {
            throw new BaseError('MANAGER_NOT_FOUND', 'Manager not found');
        }
        const contractAddress = ethers.utils.getAddress(
            roles.manager.community
        );
        const community = await models.community.findOne({
            attributes: ['id'],
            where: {
                contractAddress,
            },
        });

        if (!community) {
            throw new BaseError('COMMUNITY_NOT_FOUND', 'Community not found');
        }

        let orderKey: string | null = null;
        let orderDirection: string | null = null;
        let addresses: string[] = [];
        let appUserFilter: WhereOptions | null = null;
        let beneficiaryState: string | undefined = undefined;

        if (orderBy) {
            [orderKey, orderDirection] = orderBy.split(':');
            orderDirection = orderDirection?.toLocaleLowerCase() === 'desc' ? orderDirection : 'asc';
        }

        if (searchInput) {
            if (isAddress(searchInput)) {
                addresses.push(ethers.utils.getAddress(searchInput));
            } else if (
                searchInput.toLowerCase().indexOf('drop') === -1 &&
                searchInput.toLowerCase().indexOf('delete') === -1 &&
                searchInput.toLowerCase().indexOf('update') === -1
            ) {
                appUserFilter = literal(`concat("firstName", ' ', "lastName") ILIKE '%${searchInput}%'`);
            } else {
                throw new BaseError('INVALID_SEARCH', 'Not valid search!');
            }
        }

        let beneficiariesSubgraph: BeneficiarySubgraph[] | null = null;

        if (filter.state !== undefined) {
            beneficiaryState = filter.state === 'active' ? 'state: 0' : 'state: 1';
        }

        let appUsers: AppUser[] = [];
        let count: number = 0;
        if (appUserFilter) {
            appUsers = await models.appUser.findAll({
                attributes: ['address', 'firstName', 'lastName', 'avatarMediaPath'],
                where: appUserFilter,
            });
            addresses = appUsers.map(user => user.address);
            beneficiariesSubgraph = await getBeneficiariesByAddress(
                addresses,
                beneficiaryState,
                undefined,
                contractAddress,
                orderKey ? `orderBy: ${orderKey}` : undefined,
                orderDirection ? `orderDirection: ${orderDirection}` : undefined,
            );
            count = beneficiariesSubgraph.length;

            if (count > limit) {
                beneficiariesSubgraph = beneficiariesSubgraph.slice(offset, offset + limit);
            }
        } else if (addresses.length > 0) {
            beneficiariesSubgraph = await getBeneficiariesByAddress(
                addresses,
                beneficiaryState,
                undefined,
                contractAddress,
                orderKey ? `orderBy: ${orderKey}` : undefined,
                orderDirection ? `orderDirection: ${orderDirection}` : undefined,
            );
            count = beneficiariesSubgraph.length;
            appUsers = await models.appUser.findAll({
                attributes: ['address', 'firstName', 'lastName', 'avatarMediaPath'],
                where: {
                    address: {
                        [Op.in]: addresses,
                    },
                },
            });
        } else {
            beneficiariesSubgraph = await getBeneficiaries(
                contractAddress,
                limit,
                offset,
                undefined,
                beneficiaryState,
                orderKey ? `orderBy: ${orderKey}` : undefined,
                orderDirection ? `orderDirection: ${orderDirection}` : undefined,
            );
            count = await countBeneficiaries(
                contractAddress,
                filter.state ? filter.state : 'all'
            );
            addresses = beneficiariesSubgraph.map(beneficiary => ethers.utils.getAddress(beneficiary.address));
            appUsers = await models.appUser.findAll({
                attributes: ['address', 'firstName', 'lastName', 'avatarMediaPath'],
                where: {
                    address: {
                        [Op.in]: addresses,
                    },
                },
            });
        }

        if (!beneficiariesSubgraph || !beneficiariesSubgraph.length) {
            count = 0;
        }

        const result: IListBeneficiary[] = beneficiariesSubgraph.map(beneficiary => {
            const user = appUsers.find((user) => user.address === ethers.utils.getAddress(beneficiary.address));
            return {
                address: beneficiary.address,
                firstName: user?.firstName,
                lastName: user?.lastName,
                avatarMediaPath: user?.avatarMediaPath,
                since: beneficiary.since || 0,
                claimed: beneficiary.claimed,
                blocked: beneficiary.state === 2,
                suspect: user?.suspect,
                isDeleted:
                    !user || !!user!.deletedAt,
                state:
                    beneficiary.state === 0
                        ? 'active'
                        : beneficiary.state === 1
                        ? 'removed'
                        : 'locked',
            }
        });

        return {
            count,
            rows: result,
        };
    }

    public async findById(
        id: number,
        userAddress?: string
    ): Promise<CommunityAttributes> {
        return this._findCommunityBy({ id }, userAddress);
    }

    public async findByContractAddress(
        contractAddress: string,
        userAddress?: string
    ): Promise<CommunityAttributes> {
        return this._findCommunityBy({ contractAddress }, userAddress);
    }

    private async _findCommunityBy(
        where: WhereOptions<CommunityAttributes>,
        userAddress?: string
    ): Promise<CommunityAttributes> {
        const community = await models.community.findOne({
            where,
        });
        if (community === null) {
            throw new BaseError(
                'COMMUNITY_NOT_FOUND',
                'Not found community ' + where
            );
        }

        let showEmail = false;
        if (userAddress) {
            // verify if user is the community creator, ambassador or manager
            if (
                (community.status === 'pending' &&
                    community.requestByAddress === userAddress) ||
                community.ambassadorAddress === userAddress
            ) {
                showEmail = true;
            } else {
                const userRole = await getUserRoles(userAddress);
                if (userRole.manager) {
                    showEmail =
                        ethers.utils.getAddress(userRole.manager.community) ===
                        community.contractAddress;
                }
            }
        }

        const state = (await this.getState(community.id)) as any;

        return {
            ...community.toJSON(),
            state,
            email: showEmail ? community.email : '',
        };
    }

    public async count(groupBy: string, status?: string, excludeCountry?: string): Promise<any[]> {
        let groupName = '';
        switch (groupBy) {
            case 'country':
                groupName = 'country';
                break;
            case 'review':
                groupName = 'review';
                break;
            case 'reviewByCountry':
                groupName = 'reviewByCountry';
                break;
        }

        let where: WhereOptions = {
            visibility: 'public',
        }
        if (groupName.length === 0) {
            throw new BaseError('INVALID_GROUP', 'invalid group');
        }
        if (status) {
            where = {
                ...where,
                status,
            }
        }

        if (excludeCountry) {
            const countries = excludeCountry.split(';');
            where = {
                ...where,
                country: {
                    [Op.notIn]: countries,
                }
            }
        }

        if (groupName === 'reviewByCountry') {
            const result = (await models.community.findAll({
                attributes: [
                    'country', [fn('count', col('country')), 'count'],
                    [fn('count', literal("CASE WHEN review = 'pending' THEN 1 END")), 'pending' ],
                    [fn('count', literal("CASE WHEN review = 'claimed' THEN 1 END")), 'claimed' ],
                    [fn('count', literal("CASE WHEN review = 'declined' THEN 1 END")), 'declined' ],
                    [fn('count', literal("CASE WHEN review = 'accepted' THEN 1 END")), 'accepted' ],
                ],
                where,
                group: ['country'],
            })) as any;
    
            return result;
        }

        const result = (await models.community.findAll({
            attributes: [groupName, [fn('count', col(groupName)), 'count']],
            where,
            group: [groupName],
            raw: true,
        })) as any;

        return result;
    }
}
