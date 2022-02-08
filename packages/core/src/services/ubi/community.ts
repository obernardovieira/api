import { ethers } from 'ethers';
import {
    Op,
    QueryTypes,
    fn,
    col,
    literal,
    OrderItem,
    WhereOptions,
    Includeable,
    Order,
} from 'sequelize';
import { Literal } from 'sequelize/types/lib/utils';

import config from '../../config';
import CommunityContractABI from '../../contracts/CommunityABI.json';
import ImpactMarketContractABI from '../../contracts/ImpactMarketABI.json';
import { models, sequelize } from '../../database';
import { Community } from '../../database/models/ubi/community';
import { ManagerAttributes } from '../../database/models/ubi/manager';
import { AppUser } from '../../interfaces/app/appUser';
import {
    CommunityAttributes,
    IBaseCommunityAttributes,
    ICommunityCreationAttributes,
} from '../../interfaces/ubi/community';
import { UbiRequestChangeParams } from '../../interfaces/ubi/requestChangeParams';
import { UbiCommunityCampaign } from '../../interfaces/ubi/ubiCommunityCampaign';
import { UbiCommunityContract } from '../../interfaces/ubi/ubiCommunityContract';
import { UbiCommunityDailyMetrics } from '../../interfaces/ubi/ubiCommunityDailyMetrics';
import { UbiCommunityLabel } from '../../interfaces/ubi/ubiCommunityLabel';
import { UbiCommunityState } from '../../interfaces/ubi/ubiCommunityState';
import { UbiCommunitySuspect } from '../../interfaces/ubi/ubiCommunitySuspect';
import { UbiPromoter } from '../../interfaces/ubi/ubiPromoter';
import { BaseError } from '../../utils/baseError';
import { fetchData } from '../../utils/dataFetching';
import { notifyManagerAdded } from '../../utils/util';
import {
    ICommunity,
    ICommunityLightDetails,
    ICommunityPendingDetails,
    IManagerDetailsManager,
} from '../endpoints';
import { CommunityContentStorage, PromoterContentStorage } from '../storage';
import CommunityContractService from './communityContract';
import ManagerService from './managers';

export default class CommunityService {
    public static community = models.community;
    public static manager = models.manager;
    public static appUser = models.appUser;
    public static ubiCommunityContract = models.ubiCommunityContract;
    public static ubiCommunityDailyMetrics = models.ubiCommunityDailyMetrics;
    public static ubiCommunityDailyState = models.ubiCommunityDailyState;
    public static ubiCommunityDemographics = models.ubiCommunityDemographics;
    // public static claimLocation = models.claimLocation;
    public static ubiRequestChangeParams = models.ubiRequestChangeParams;
    public static ubiCommunitySuspect = models.ubiCommunitySuspect;
    public static ubiPromoter = models.ubiPromoter;
    public static ubiPromoterSocialMedia = models.ubiPromoterSocialMedia;
    public static ubiCommunityLabels = models.ubiCommunityLabels;
    public static ubiCommunityCampaign = models.ubiCommunityCampaign;
    public static appMediaContent = models.appMediaContent;
    public static appMediaThumbnail = models.appMediaThumbnail;
    public static ubiBeneficiaryRegistry = models.ubiBeneficiaryRegistry;
    public static beneficiary = models.beneficiary;
    public static ubiClaim = models.ubiClaim;
    public static sequelize = sequelize;

    private static communityContentStorage = new CommunityContentStorage();
    private static promoterContentStorage = new PromoterContentStorage();

    public static async create({
        requestByAddress,
        name,
        contractAddress,
        description,
        language,
        currency,
        city,
        country,
        gps,
        email,
        txReceipt,
        contractParams,
        coverMediaId,
    }: ICommunityCreationAttributes): Promise<Community> {
        let managerAddress: string = '';
        let createObject: ICommunityCreationAttributes = {
            requestByAddress,
            name,
            description,
            language,
            currency,
            city,
            country,
            gps,
            email,
            // coverMediaId,
            // coverImage: media!.url,
            visibility: 'public', // will be changed if private
            status: 'pending', // will be changed if private
            started: new Date(),
        };

        if (coverMediaId) {
            const media = await this.appMediaContent.findOne({
                where: { id: coverMediaId },
            });
            createObject = {
                ...createObject,
                coverMediaId,
                coverImage: media!.url,
            };
        }

        // if it was submitted as private, validate the transaction first.
        if (txReceipt !== undefined) {
            const ifaceCommunity = new ethers.utils.Interface(
                CommunityContractABI
            );
            const eventsCoomunity: ethers.utils.LogDescription[] = [];
            for (let index = 0; index < txReceipt.logs.length; index++) {
                try {
                    const parsedLog = ifaceCommunity.parseLog(
                        txReceipt.logs[index]
                    );
                    eventsCoomunity.push(parsedLog);
                } catch (e) {}
            }
            const index = eventsCoomunity.findIndex(
                (event) => event !== null && event.name === 'ManagerAdded'
            );
            if (index !== -1) {
                managerAddress = eventsCoomunity[index].args[0];
            } else {
                throw new BaseError('EVENT_NOT_FOUND', 'Event not found!');
            }
            createObject = {
                ...createObject,
                contractAddress: contractAddress!,
                visibility: 'private',
                status: 'valid',
            };
        }

        const t = await this.sequelize.transaction();
        try {
            const community = await this.community.create(createObject, {
                transaction: t,
            });
            await CommunityContractService.add(
                community.id,
                contractParams!,
                t
            );
            // await CommunityStateService.add
            if (txReceipt !== undefined) {
                await ManagerService.add(managerAddress, community.id, t);
            }
            // If the execution reaches this line, no errors were thrown.
            // We commit the transaction.
            await t.commit();
            return community;
        } catch (error) {
            // If the execution reaches this line, an error was thrown.
            // We rollback the transaction.
            await t.rollback();
            // Since this is the service, we throw the error back to the controller,
            // so the route returns an error.
            if ((error as any).name === 'SequelizeUniqueConstraintError') {
                throw new BaseError(
                    'ALREADY_HAS_COMMUNITY',
                    'A user cannot create two communities'
                );
            }
            throw new BaseError('ERROR', (error as any).message);
        }
    }

    public static async getPresignedUrlMedia(
        mime: string,
        isPromoter: boolean
    ) {
        if (isPromoter) {
            return this.promoterContentStorage.getPresignedUrlPutObject(mime);
        }
        return this.communityContentStorage.getPresignedUrlPutObject(mime);
    }

    public static async edit(
        id: number,
        params: {
            name: string;
            description: string;
            currency: string;
            coverMediaId: number;
            email?: string;
        },
        userAddress?: string
    ): Promise<CommunityAttributes> {
        const community = await this.community.findOne({
            attributes: ['coverMediaId'],
            where: { id },
        });
        if (community === null) {
            throw new BaseError('COMMUNITY_NOT_FOUND', 'community not found!');
        }
        // since cover can't be null, we first update and then remove
        const { name, description, currency, coverMediaId, email } = params;
        const update = await this.community.update(
            { name, description, currency, email },
            { where: { id } }
        );
        if (coverMediaId !== -1 && community.coverMediaId !== coverMediaId) {
            // image has been replaced
            // delete previous one! new one was already uploaded, will be updated below
            await this.communityContentStorage.deleteContent(
                community.coverMediaId!
            );
            await this.community.update({ coverMediaId }, { where: { id } });
        }
        if (update[0] === 0) {
            throw new BaseError('UPDATE_FAILED', 'community was not updated!');
        }
        return this._findCommunityBy({ id }, userAddress);
    }

    public static async delete(id: number): Promise<boolean> {
        const c = await this.community.findOne({
            where: {
                id,
                status: 'pending',
                visibility: 'public',
            },
            raw: true,
        });
        if (c) {
            await this.community.destroy({
                where: {
                    id,
                },
            });
            await this.communityContentStorage.deleteContent(c.coverMediaId!); // TODO: will be required once next version is released
            return true;
        }
        return false;
    }

    /**
     * List all valid communities, both public and private
     */
    public static async listCommunitiesStructOnly(): Promise<Community[]> {
        return await this.community.findAll({
            where: {
                status: 'valid',
            },
            raw: true,
        });
    }

    /**
     * Count public valid communities
     */
    public static async countPublicCommunities(): Promise<number> {
        const communities = (await this.community.findAll({
            attributes: [[fn('count', col('contractAddress')), 'total']],
            where: {
                status: 'valid',
                visibility: 'public',
            },
            raw: true,
        })) as any;
        return communities[0].total;
    }

    public static async count(groupBy: string): Promise<any[]> {
        let groupName = '';
        switch (groupBy) {
            case 'country':
                groupName = 'country';
                break;
        }
        if (groupName.length === 0) {
            throw new BaseError('INVALID_GROUP', 'invalid group');
        }
        const result = (await models.community.findAll({
            attributes: [groupName, [fn('count', col(groupName)), 'count']],
            where: {
                visibility: 'public',
                status: 'valid',
            },
            group: [groupName],
            raw: true,
        })) as any;

        return result;
    }

    public static async list(query: {
        orderBy?: string;
        filter?: string;
        name?: string;
        country?: string;
        extended?: string;
        offset?: string;
        limit?: string;
        lat?: string;
        lng?: string;
        fields?: string;
        status?: 'valid' | 'pending';
    }): Promise<{ count: number; rows: CommunityAttributes[] }> {
        let extendedWhere: WhereOptions<CommunityAttributes> = {};
        const orderOption: OrderItem[] = [];
        const orderBeneficiary: OrderItem[] = [];
        const orderOutOfFunds = {
            active: false,
            orderType: '',
        };

        let beneficiariesState:
            | [
                  {
                      id: number;
                      beneficiaries: string;
                  }
              ]
            | undefined = undefined;
        let claimsState:
            | [
                  {
                      communityId: number;
                      claimed: string;
                  }
              ]
            | undefined = undefined;
        let inflowState:
            | [
                  {
                      id: number;
                      raised: string;
                  }
              ]
            | undefined = undefined;
        let backerState:
            | [
                  {
                      id: number;
                      backers: string;
                  }
              ]
            | undefined = undefined;
        let communitiesId: number[] = [];

        if (query.filter === 'featured') {
            const featuredIds = (
                await this.ubiCommunityLabels.findAll({
                    attributes: ['communityId'],
                    where: { label: 'featured' },
                })
            ).map((c) => (c.toJSON() as UbiCommunityLabel).communityId);
            extendedWhere = {
                ...extendedWhere,
                id: { [Op.in]: featuredIds },
            };
        }

        if (query.name) {
            extendedWhere = {
                ...extendedWhere,
                name: {
                    [Op.iLike]: `%${query.name}%`,
                },
            };
        }

        if (query.country) {
            extendedWhere = {
                ...extendedWhere,
                country: {
                    [Op.in]: query.country.split(';'),
                },
            };
        }

        if (query.orderBy) {
            const orders = query.orderBy.split(';');

            for (let i = 0; i < orders.length; i++) {
                const [order, orderType] = orders[i].split(':');

                switch (order) {
                    case 'nearest': {
                        if (
                            query.lat === undefined ||
                            query.lng === undefined
                        ) {
                            throw new BaseError(
                                'INVALID_COORDINATES',
                                'invalid coordinates'
                            );
                        }
                        const lat = parseInt(query.lat, 10);
                        const lng = parseInt(query.lng, 10);
                        if (
                            typeof lat !== 'number' ||
                            typeof lng !== 'number'
                        ) {
                            throw new BaseError('NaN', 'not a number');
                        }

                        orderOption.push([
                            literal(
                                '(6371*acos(cos(radians(' +
                                    lat +
                                    "))*cos(radians(cast(gps->>'latitude' as float)))*cos(radians(cast(gps->>'longitude' as float))-radians(" +
                                    lng +
                                    '))+sin(radians(' +
                                    lat +
                                    "))*sin(radians(cast(gps->>'latitude' as float)))))"
                            ),
                            orderType ? orderType : 'ASC',
                        ]);
                        break;
                    }
                    case 'out_of_funds': {
                        // this requires extended
                        query.extended = 'true';
                        // check if there was another order previously
                        if (
                            orderOption.length === 0 &&
                            orderBeneficiary.length === 0
                        ) {
                            const result = await this._getOutOfFunds(
                                {
                                    limit: query.limit,
                                    offset: query.offset,
                                },
                                orderType
                            );
                            communitiesId = result.map((el) => el.id);
                        } else {
                            // list communities out of funds after
                            orderOutOfFunds.active = true;
                            orderOutOfFunds.orderType = orderType;
                        }
                        break;
                    }
                    case 'newest':
                        orderOption.push([
                            literal('"Community".started'),
                            orderType ? orderType : 'DESC',
                        ]);
                        break;
                    default: {
                        // check if there was another order previously
                        if (
                            orderOption.length === 0 &&
                            !orderOutOfFunds.active
                        ) {
                            beneficiariesState =
                                await this._getBeneficiaryState(
                                    {
                                        status: query.status,
                                        limit: query.limit,
                                        offset: query.offset,
                                    },
                                    extendedWhere,
                                    orderType
                                );
                            communitiesId = beneficiariesState!.map(
                                (el) => el.id
                            );
                        } else {
                            orderBeneficiary.push([
                                literal('count("beneficiaries"."address")'),
                                orderType ? orderType : 'DESC',
                            ]);
                        }

                        break;
                    }
                }
            }
        } else {
            beneficiariesState = await this._getBeneficiaryState(
                {
                    status: query.status,
                    limit: query.limit,
                    offset: query.offset,
                },
                extendedWhere
            );
            communitiesId = beneficiariesState!.map((el) => el.id);
        }

        let include: Includeable[];
        let attributes: any;
        let returnState = true;
        const exclude = ['email'];
        if (query.fields) {
            const fields = fetchData(query.fields);
            if (!fields.state) returnState = false;
            include = this._generateInclude(fields);
            attributes = fields.root
                ? fields.root.length > 0
                    ? fields.root.filter((el: string) => !exclude.includes(el))
                    : { exclude }
                : [];
        } else {
            include = this._oldInclude(query.extended);
            attributes = {
                exclude,
            };
        }

        const communityCount = await this.community.count({
            where: {
                status: query.status ? query.status : 'valid',
                visibility: 'public',
                ...extendedWhere,
            },
        });

        let communitiesResult: Community[];

        if (communitiesId.length > 0) {
            communitiesResult = await this.community.findAll({
                attributes,
                order: orderOption,
                where: {
                    id: {
                        [Op.in]: communitiesId,
                    },
                },
                include,
            });
            // re-order
            if (orderOption.length > 0) {
                communitiesId = communitiesResult!.map((el) => el.id);
            }
        } else {
            communitiesResult = await this.community.findAll({
                attributes,
                include,
                order: orderOption,
                where: {
                    status: query.status ? query.status : 'valid',
                    visibility: 'public',
                    ...extendedWhere,
                },
                offset: query.offset
                    ? parseInt(query.offset, 10)
                    : config.defaultOffset,
                limit: query.limit
                    ? parseInt(query.limit, 10)
                    : config.defaultLimit,
            });
            communitiesId = communitiesResult!.map((el) => el.id);
        }

        if (orderOutOfFunds.active) {
            const result = await this._getOutOfFunds(
                {
                    limit: query.limit,
                    offset: query.offset,
                },
                orderOutOfFunds.orderType,
                communitiesId
            );
            // re-order by out of funds
            communitiesId = result.map((el) => el.id);
        }

        if (returnState) {
            if (!beneficiariesState) {
                beneficiariesState = (await models.community.findAll({
                    attributes: [
                        'id',
                        [
                            fn(
                                'count',
                                fn('distinct', col('beneficiaries.address'))
                            ),
                            'beneficiaries',
                        ],
                    ],
                    order: orderBeneficiary,
                    include: [
                        {
                            attributes: [],
                            model: models.beneficiary,
                            as: 'beneficiaries',
                            where: {
                                active: true,
                            },
                            duplicating: false,
                        },
                    ],
                    where: {
                        id: {
                            [Op.in]: communitiesId,
                        },
                    },
                    group: ['Community.id'],
                    raw: true,
                })) as any;

                // re-order by total beneficiaries
                if (orderBeneficiary.length > 0) {
                    communitiesId = beneficiariesState!.map((el) => el.id);
                }
            }

            if (!claimsState) {
                claimsState = (await models.ubiClaim.findAll({
                    attributes: [
                        'communityId',
                        [
                            fn('coalesce', fn('sum', col('amount')), '0'),
                            'claimed',
                        ],
                    ],
                    where: {
                        communityId: {
                            [Op.in]: communitiesId,
                        },
                    },
                    group: ['communityId'],
                    raw: true,
                })) as any;
            }

            if (!inflowState) {
                inflowState = (await models.community.findAll({
                    attributes: [
                        'id',
                        [
                            fn('coalesce', fn('sum', col('amount')), '0'),
                            'raised',
                        ],
                    ],
                    include: [
                        {
                            attributes: [],
                            model: models.inflow,
                            as: 'inflow',
                        },
                    ],
                    where: {
                        id: {
                            [Op.in]: communitiesId,
                        },
                    },
                    group: ['Community.id'],
                    raw: true,
                })) as any;
            }

            if (!backerState) {
                backerState = (await models.community.findAll({
                    attributes: [
                        'id',
                        [
                            fn('count', fn('distinct', col('inflow.from'))),
                            'backers',
                        ],
                    ],
                    include: [
                        {
                            attributes: [],
                            model: models.inflow,
                            as: 'inflow',
                        },
                    ],
                    where: {
                        id: {
                            [Op.in]: communitiesId,
                        },
                    },
                    group: ['Community.id'],
                    raw: true,
                })) as any;
            }
        }

        //formate response
        const communities: CommunityAttributes[] = [];
        communitiesId.forEach((id) => {
            let community: CommunityAttributes;
            const filteredCommunity = communitiesResult.find(
                (el) => el.id === id
            );
            community = {
                ...(filteredCommunity?.toJSON() as CommunityAttributes),
            };

            if (returnState) {
                const beneficiariesModel = beneficiariesState?.find(
                    (el) => el.id === id
                );
                const claimModel = claimsState?.find(
                    (el) => el.communityId === id
                );
                const raiseModel = inflowState?.find((el) => el.id === id);
                const backerModel = backerState?.find((el) => el.id === id);
                community = {
                    ...community,
                    state: {
                        beneficiaries: beneficiariesModel
                            ? Number(beneficiariesModel.beneficiaries)
                            : 0,
                        claimed: claimModel ? claimModel.claimed : '0',
                        raised: raiseModel ? raiseModel.raised : '0',
                        backers: backerModel ? Number(backerModel.backers) : 0,
                    },
                };
            }
            communities.push(community);
        });

        return {
            count: communityCount,
            rows: communities,
        };
    }

    public static async findResquestChangeUbiParams(
        id: number
    ): Promise<UbiRequestChangeParams | null> {
        const community = (await this.community.findOne({
            attributes: ['publicId'],
            where: { id },
            raw: true,
        }))!;
        return this.ubiRequestChangeParams.findOne({
            where: { communityId: community.publicId },
        });
    }

    public static async findById(
        id: number,
        userAddress?: string
    ): Promise<CommunityAttributes> {
        return this._findCommunityBy({ id }, userAddress);
    }

    public static async findByContractAddress(
        contractAddress: string,
        userAddress?: string
    ): Promise<CommunityAttributes> {
        return this._findCommunityBy({ contractAddress }, userAddress);
    }

    public static async getDashboard(id: string) {
        const result = await this.community.findOne({
            attributes: {
                exclude: ['email'],
            },
            include: [
                {
                    model: this.ubiCommunityContract,
                    as: 'contract',
                },
                {
                    model: this.ubiCommunityDailyMetrics,
                    required: false,
                    as: 'metrics',
                    order: [['date', 'DESC']],
                    limit: 30,
                },
                {
                    model: this.ubiCommunityDailyState,
                    as: 'dailyState',
                    order: [['date', 'DESC']],
                    limit: 30,
                    where: {
                        date: { [Op.lt]: new Date() },
                    },
                },
            ],
            where: {
                id,
            },
        });
        const state = await this.getState(Number(id));
        // add reachedLastMonth
        const aMonthAgo = new Date();
        aMonthAgo.setDate(aMonthAgo.getDate() - 30);
        aMonthAgo.setHours(0, 0, 0, 0);
        const reachedLastMonth: {
            reach: string;
            reachOut: string;
        } = (await this.community.findOne({
            attributes: [
                [
                    fn(
                        'count',
                        fn(
                            'distinct',
                            col('"beneficiaries->transactions"."withAddress"')
                        )
                    ),
                    'reach',
                ],
                [
                    literal(
                        'count(distinct "beneficiaries->transactions"."withAddress") filter (where "beneficiaries->transactions"."withAddress" not in (select distinct address from beneficiary where active = true))'
                    ),
                    'reachOut',
                ],
            ],
            include: [
                {
                    model: models.beneficiary,
                    as: 'beneficiaries',
                    attributes: [],
                    required: false,
                    include: [
                        {
                            model: models.ubiBeneficiaryTransaction,
                            as: 'transactions',
                            where: literal(
                                `date("beneficiaries->transactions"."txAt") = '${
                                    aMonthAgo.toISOString().split('T')[0]
                                }'`
                            ),
                            attributes: [],
                            required: false,
                        },
                    ],
                },
            ],
            where: {
                id,
            },
            raw: true,
        })) as any;
        return {
            ...result!.toJSON(),
            state,
            reachedLastMonth,
        } as CommunityAttributes & {
            reachedLastMonth: {
                reach: string;
                reachOut: string;
            };
        };
    }

    public static async getDemographics(id: string) {
        return this.ubiCommunityDemographics.findAll({
            where: { communityId: id },
            order: [['date', 'DESC']],
            limit: 1,
        });
    }

    public static async getManagers(
        communityId: number,
        active?: boolean
    ): Promise<
        {
            isDeleted: boolean;
            added: number;
            address?: string;
            user?: AppUser;
        }[]
    > {
        const community = (await this.community.findOne({
            where: { id: communityId },
        }))!;

        let activeCondition = {};
        if (active !== undefined) {
            activeCondition = {
                active,
            };
        }

        if (community.status === 'pending') {
            const user = await this.appUser.findOne({
                attributes: ['address', 'username'],
                include: [
                    {
                        model: this.appMediaContent,
                        as: 'avatar',
                        required: false,
                        include: [
                            {
                                model: this.appMediaThumbnail,
                                as: 'thumbnails',
                                separate: true,
                            },
                        ],
                    },
                ],
                where: {
                    address: community.requestByAddress,
                },
            });
            return [
                {
                    user: user as AppUser,
                    isDeleted: false,
                    added: 0,
                },
            ];
        } else {
            const result = await this.manager.findAll({
                attributes: ['address'],
                include: [
                    {
                        model: this.appUser,
                        as: 'user',
                        attributes: ['username'],
                        include: [
                            {
                                model: this.appMediaContent,
                                as: 'avatar',
                                required: false,
                                include: [
                                    {
                                        model: this.appMediaThumbnail,
                                        as: 'thumbnails',
                                        separate: true,
                                    },
                                ],
                            },
                        ],
                    },
                ],
                where: {
                    communityId: community.id,
                    ...activeCondition,
                },
            });

            const beneficiariesAdded =
                await this.ubiBeneficiaryRegistry.findAll({
                    attributes: [
                        [fn('COUNT', col('address')), 'count'],
                        'from',
                    ],
                    where: {
                        from: {
                            [Op.in]: result.map((el) => el.address),
                        },
                    },
                    group: ['from'],
                    raw: true,
                });

            return result.map((r) => {
                const manager = r.toJSON() as ManagerAttributes;
                const added = beneficiariesAdded.find(
                    (el) => el.from === manager.address
                );
                return {
                    ...manager,
                    isDeleted: !manager.user,
                    added: Number((added as any)?.count) || 0,
                    pending: false,
                };
            });
        }
    }

    public static async getPromoter(communityId: number) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const result = await this.ubiPromoter.findOne({
            include: [
                {
                    model: this.community,
                    as: 'community',
                    required: true,
                    attributes: [],
                    where: {
                        id: communityId,
                    },
                },
                {
                    model: this.ubiPromoterSocialMedia,
                    as: 'socialMedia',
                },
                {
                    model: this.appMediaContent,
                    as: 'logo',
                    include: [
                        {
                            model: this.appMediaThumbnail,
                            as: 'thumbnails',
                            separate: true,
                        },
                    ],
                },
            ],
        });
        return result !== null ? (result.toJSON() as UbiPromoter) : null;
    }

    public static async getSuspect(communityId: number) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const result = await this.ubiCommunitySuspect.findOne({
            where: {
                communityId,
                createdAt: {
                    [Op.gte]: yesterday.toISOString().split('T')[0],
                },
            },
        });
        return result !== null
            ? (result.toJSON() as UbiCommunitySuspect)
            : null;
    }

    public static async getContract(communityId: number) {
        const result = await this.ubiCommunityContract.findOne({
            where: {
                communityId,
            },
        });
        return result !== null
            ? (result.toJSON() as UbiCommunityContract)
            : null;
    }

    public static async getState(communityId: number) {
        const community = await this.community.findOne({
            attributes: ['contractAddress', 'publicId'],
            where: {
                id: communityId,
            },
        });

        const communityBackers = await models.inflow.count({
            distinct: true,
            col: 'from',
            where: {
                contractAddress: community?.contractAddress,
            },
        });

        const communityClaimActivity = (
            await this.ubiClaim.findAll({
                attributes: [
                    [fn('coalesce', fn('sum', col('amount')), '0'), 'claimed'],
                    [fn('coalesce', fn('count', col('amount')), '0'), 'claims'],
                ],
                where: {
                    communityId,
                },
                raw: true,
            })
        )[0];

        const communityInflowActivity = (
            await models.inflow.findAll({
                attributes: [
                    [fn('sum', fn('coalesce', col('amount'), 0)), 'amount'],
                ],
                where: {
                    contractAddress: community?.contractAddress,
                },
            })
        )[0];

        const communityBeneficiaryActivity = (await this.beneficiary.findAll({
            attributes: [[fn('COUNT', col('address')), 'count'], 'active'],
            where: {
                communityId,
            },
            group: ['active'],
            raw: true,
        })) as any;

        const communityManagerActivity = await this.manager.count({
            where: {
                communityId,
                active: true,
            },
        });

        const beneficiaries: { count: string; active: boolean } =
            communityBeneficiaryActivity.find((el: any) => el.active);
        const removedBeneficiaries: { count: string; active: boolean } =
            communityBeneficiaryActivity.find((el: any) => !el.active);

        return {
            claims: communityClaimActivity
                ? Number((communityClaimActivity as any).claims)
                : 0,
            claimed: communityClaimActivity
                ? (communityClaimActivity as any).claimed
                : '0',
            raised: communityInflowActivity.amount
                ? communityInflowActivity.amount
                : '0',
            beneficiaries: beneficiaries ? Number(beneficiaries.count) : 0,
            removedBeneficiaries: removedBeneficiaries
                ? Number(removedBeneficiaries.count)
                : 0,
            managers: communityManagerActivity,
            backers: communityBackers,
            communityId,
        };
    }

    public static async getCampaign(communityId: number) {
        const result = await this.ubiCommunityCampaign.findOne({
            where: {
                communityId,
            },
        });
        return result !== null
            ? (result.toJSON() as UbiCommunityCampaign)
            : null;
    }

    public static async getMetrics(communityId: number) {
        const result = await this.ubiCommunityDailyMetrics.findAll({
            where: {
                communityId,
            },
            order: [['createdAt', 'DESC']],
            limit: 1,
        });
        return result.length > 0
            ? (result[0].toJSON() as UbiCommunityDailyMetrics)
            : null;
    }

    public static async getCommunityOnlyByPublicId(
        publicId: string
    ): Promise<Community | null> {
        return this.community.findOne({
            where: {
                publicId,
            },
            raw: true,
        });
    }

    public static async getCommunityOnlyById(
        id: number
    ): Promise<Community | null> {
        return this.community.findOne({
            where: {
                id,
            },
            raw: true,
        });
    }

    public static async existsByContractAddress(
        contractAddress: string
    ): Promise<boolean> {
        const community = await this.community.count({
            where: {
                contractAddress,
            },
        });
        return community !== 0;
    }

    public static async getAllAddressesAndIds(): Promise<Map<string, string>> {
        const result = await this.community.findAll({
            attributes: ['contractAddress', 'publicId'],
            where: {
                contractAddress: {
                    [Op.ne]: null,
                },
            },
            raw: true,
        });
        return new Map(result.map((c) => [c.contractAddress!, c.publicId]));
    }

    public static async findByFirstManager(
        requestByAddress: string
    ): Promise<number | null> {
        const community = await this.community.findOne({
            attributes: ['id'],
            where: {
                requestByAddress,
                status: {
                    [Op.or]: ['valid', 'pending'],
                },
            },
            raw: true,
        });
        if (community) {
            return community.id;
        }
        return null;
    }

    public static async getOnlyCommunityByContractAddress(
        contractAddress: string
    ): Promise<Community | null> {
        return await this.community.findOne({
            where: { contractAddress },
            raw: true,
        });
    }

    // ADMIN METHODS

    public static async pending(): Promise<ICommunityPendingDetails[]> {
        // by the time of writting, sequelize
        // does not support eager loading with global "raw: false".
        // Please, check again, and if available, update this
        // https://github.com/sequelize/sequelize/issues/6408
        const sqlQuery =
            'select id, "publicId", "contractAddress", "requestByAddress", name, city, country, description, email, "coverImage", cc.*, cs.* ' +
            'from community c ' +
            'left join ubi_community_contract cc on c.id = cc."communityId" ' +
            'left join ubi_community_state cs on c.id = cs."communityId" ' +
            "where status = 'pending' and visibility = 'public' order by c.\"createdAt\" DESC limit 20";

        const rawResult: ({
            id: number;
            publicId: string;
            contractAddress: string;
            requestByAddress: string;
            name: string;
            city: string;
            country: string;
            description: string;
            email: string;
            coverImage: string;
        } & UbiCommunityState &
            UbiCommunityContract)[] = await this.sequelize.query(sqlQuery, {
            type: QueryTypes.SELECT,
        });

        const results: ICommunityPendingDetails[] = rawResult.map((c) => ({
            id: c.id,
            publicId: c.publicId,
            contractAddress: c.contractAddress,
            requestByAddress: c.requestByAddress,
            name: c.name,
            city: c.city,
            country: c.country,
            description: c.description,
            email: c.email,
            coverImage: c.coverImage,
            contract: {
                baseInterval: c.baseInterval,
                claimAmount: c.claimAmount,
                incrementInterval: c.incrementInterval,
                maxClaim: c.maxClaim,
                // values below don't matter
                communityId: c.id,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
                decreaseStep: c.decreaseStep,
                blocked: c.blocked,
            },
            state: {
                backers: c.backers,
                beneficiaries: c.beneficiaries,
                removedBeneficiaries: c.removedBeneficiaries,
                managers: c.managers,
                claimed: c.claimed,
                claims: c.claims,
                raised: c.raised,
                // values below don't matter
                communityId: c.id,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
            },
            // values below don't matter
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
        }));

        return results;
    }

    public static async accept(
        acceptanceTransaction: string,
        publicId: string
    ): Promise<string | null> {
        const provider = new ethers.providers.JsonRpcProvider(
            config.jsonRpcUrl
        );
        const receipt = await provider.waitForTransaction(
            acceptanceTransaction
        );
        const ifaceImpactMarket = new ethers.utils.Interface(
            ImpactMarketContractABI
        );
        if (receipt.logs === undefined) {
            return null;
        }
        const eventsImpactMarket: ethers.utils.LogDescription[] = [];
        for (let index = 0; index < receipt.logs.length; index++) {
            try {
                const parsedLog = ifaceImpactMarket.parseLog(
                    receipt.logs[index]
                );
                eventsImpactMarket.push(parsedLog);
            } catch (e) {}
        }
        const index = eventsImpactMarket.findIndex(
            (event) => event !== null && event.name === 'CommunityAdded'
        );
        if (index !== -1) {
            const communityContractAddress =
                eventsImpactMarket[index].args._communityAddress;

            const t = await this.sequelize.transaction();
            try {
                const dbUpdate: [number, Community[]] =
                    await this.community.update(
                        {
                            contractAddress: communityContractAddress,
                            status: 'valid',
                        },
                        { returning: true, where: { publicId }, transaction: t }
                    );
                if (dbUpdate[0] === 1) {
                    notifyManagerAdded(
                        dbUpdate[1][0].requestByAddress,
                        communityContractAddress
                    );
                } else {
                    throw new BaseError(
                        'UPDATE_FAILED',
                        'Did not update ' +
                            dbUpdate[1][0].id +
                            ' after acceptance!'
                    );
                }
                // If the execution reaches this line, no errors were thrown.
                // We commit the transaction.
                await t.commit();
                return communityContractAddress;
            } catch (error) {
                // If the execution reaches this line, an error was thrown.
                // We rollback the transaction.
                await t.rollback();
                // Since this is the service, we throw the error back to the controller,
                // so the route returns an error.
                throw error;
            }
        }
        return null;
    }

    // TODO: DEPRECATED METHODS

    /**
     * @deprecated Use delete
     */
    public static async remove(publicId: string): Promise<boolean> {
        const c = await this.community.findOne({
            where: {
                publicId,
                status: 'pending',
                visibility: 'public',
            },
            raw: true,
        });
        if (c) {
            await this.community.destroy({
                where: {
                    publicId,
                },
            });
            await this.communityContentStorage.deleteContent(c.coverMediaId!); // TODO: will be required once next version is released
            return true;
        }
        return false;
    }

    /**
     * @deprecated
     */
    public static async listLight(
        order: string | undefined,
        query: any
    ): Promise<ICommunityLightDetails[]> {
        let offset: number | undefined;
        let limit: number | undefined;
        let useOrder = '';
        let orderOption: Order | undefined;

        let beneficiariesState:
            | [
                  {
                      id: number;
                      beneficiaries: string;
                  }
              ]
            | undefined = undefined;
        let communitiesId: number[] = [];

        if (query.offset !== undefined && query.limit !== undefined) {
            offset = parseInt(query.offset, 10);
            limit = parseInt(query.limit, 10);
            if (typeof offset !== 'number' || typeof limit !== 'number') {
                throw new BaseError('NaN', 'not a number');
            }
        } else {
            offset = config.defaultOffset;
            limit = config.defaultLimit;
        }

        if (order === undefined && query.order !== undefined) {
            useOrder = query.order;
        } else if (order !== undefined) {
            useOrder = order;
        }
        switch (useOrder) {
            case 'nearest': {
                const lat = parseInt(query.lat, 10);
                const lng = parseInt(query.lng, 10);
                if (typeof lat !== 'number' || typeof lng !== 'number') {
                    throw new BaseError('NaN', 'not a number');
                }
                orderOption = [
                    [
                        literal(
                            '(6371*acos(cos(radians(' +
                                lat +
                                "))*cos(radians(cast(gps->>'latitude' as float)))*cos(radians(cast(gps->>'longitude' as float))-radians(" +
                                lng +
                                '))+sin(radians(' +
                                lat +
                                "))*sin(radians(cast(gps->>'latitude' as float)))))"
                        ),
                        'ASC',
                    ],
                ];
                break;
            }
            default:
                beneficiariesState = await this._getBeneficiaryState(
                    {
                        status: query.status,
                        limit: limit?.toString(),
                        offset: offset?.toString(),
                    },
                    {}
                );
                communitiesId = beneficiariesState!.map((el) => el.id);
                break;
        }

        let communitiesResult: Community[];

        if (communitiesId.length > 0) {
            communitiesResult = await this.community.findAll({
                include: [
                    {
                        model: this.ubiCommunityContract,
                        as: 'contract',
                    },
                    {
                        model: this.appMediaContent,
                        as: 'cover',
                        include: [
                            {
                                model: this.appMediaThumbnail,
                                as: 'thumbnails',
                            },
                        ],
                    },
                ],
                where: {
                    id: {
                        [Op.in]: communitiesId,
                    },
                },
            });
        } else {
            communitiesResult = await this.community.findAll({
                include: [
                    {
                        model: this.ubiCommunityContract,
                        as: 'contract',
                    },
                    {
                        model: this.appMediaContent,
                        as: 'cover',
                        include: [
                            {
                                model: this.appMediaThumbnail,
                                as: 'thumbnails',
                            },
                        ],
                    },
                ],
                where: {
                    status: 'valid',
                    visibility: 'public',
                },
                limit,
                offset,
                order: orderOption,
            });
            communitiesId = communitiesResult!.map((el) => el.id);
        }

        if (!beneficiariesState) {
            beneficiariesState = (await models.community.findAll({
                attributes: [
                    'id',
                    [
                        fn(
                            'count',
                            fn('distinct', col('beneficiaries.address'))
                        ),
                        'beneficiaries',
                    ],
                ],
                include: [
                    {
                        attributes: [],
                        model: models.beneficiary,
                        as: 'beneficiaries',
                        where: {
                            active: true,
                        },
                        duplicating: false,
                    },
                ],
                where: {
                    id: {
                        [Op.in]: communitiesId,
                    },
                },
                group: ['Community.id'],
                raw: true,
            })) as any;
        }

        const claimsState = (await models.ubiClaim.findAll({
            attributes: [
                'communityId',
                [fn('coalesce', fn('sum', col('amount')), '0'), 'claimed'],
            ],
            where: {
                communityId: {
                    [Op.in]: communitiesId,
                },
            },
            group: ['communityId'],
            raw: true,
        })) as any;

        const inflowState = (await models.community.findAll({
            attributes: [
                'id',
                [fn('coalesce', fn('sum', col('amount')), '0'), 'raised'],
            ],
            include: [
                {
                    attributes: [],
                    model: models.inflow,
                    as: 'inflow',
                },
            ],
            where: {
                id: {
                    [Op.in]: communitiesId,
                },
            },
            group: ['Community.id'],
            raw: true,
        })) as any;

        const backerState = (await models.community.findAll({
            attributes: [
                'id',
                [fn('count', fn('distinct', col('inflow.from'))), 'backers'],
            ],
            include: [
                {
                    attributes: [],
                    model: models.inflow,
                    as: 'inflow',
                },
            ],
            where: {
                id: {
                    [Op.in]: communitiesId,
                },
            },
            group: ['Community.id'],
            raw: true,
        })) as any;

        //formate response
        const communities: CommunityAttributes[] = [];
        communitiesId.forEach((id) => {
            let community: CommunityAttributes;
            const filteredCommunity = communitiesResult.find(
                (el) => el.id === id
            );
            community = {
                ...(filteredCommunity?.toJSON() as CommunityAttributes),
            };

            const beneficiariesModel = beneficiariesState?.find(
                (el) => el.id === id
            );
            const claimModel = claimsState?.find((el) => el.communityId === id);
            const raiseModel = inflowState?.find((el) => el.id === id);
            const backerModel = backerState?.find((el) => el.id === id);
            community = {
                ...community,
                state: {
                    beneficiaries: beneficiariesModel
                        ? Number(beneficiariesModel.beneficiaries)
                        : 0,
                    claimed: claimModel ? claimModel.claimed : '0',
                    raised: raiseModel ? raiseModel.raised : '0',
                    backers: backerModel ? Number(backerModel.backers) : 0,
                },
            };
            communities.push(community);
        });

        const results: ICommunityLightDetails[] = communities.map((c) => ({
            id: c.id,
            publicId: c.publicId,
            contractAddress: c.contractAddress!,
            name: c.name,
            city: c.city,
            country: c.country,
            coverImage: c.coverImage,
            cover: c.cover!,
            contract: c.contract!,
            state: c.state!,
        }));

        return results;
    }

    /**
     * @deprecated
     */
    public static async fullList(
        order?: string
    ): Promise<CommunityAttributes[]> {
        let extendedWhere: WhereOptions<CommunityAttributes> = {};
        let orderOption: string | Literal | OrderItem[] | undefined;

        switch (order) {
            case 'out_of_funds': {
                extendedWhere = {
                    state: {
                        beneficiaries: {
                            [Op.not]: 0,
                        },
                    },
                };
                orderOption = [
                    [
                        literal(
                            '(state.raised - state.claimed) / metrics."ubiRate" / state.beneficiaries'
                        ),
                        'DESC',
                    ],
                ];
                break;
            }
            case 'newest':
                orderOption = [[literal('community.started'), 'DESC']];
                break;
            default:
                orderOption = [[literal('state.beneficiaries'), 'DESC']];
                break;
        }

        const communitiesResult = await this.community.findAll({
            include: [
                {
                    model: this.ubiCommunityContract,
                    as: 'contract',
                },
                {
                    model: this.ubiCommunityDailyMetrics,
                    // required: false,
                    as: 'metrics',
                    where: {
                        date: {
                            [Op.eq]: literal(
                                '(select date from ubi_community_daily_metrics order by date desc limit 1)'
                            ),
                        } as { [Op.eq]: Literal },
                    },
                },
                {
                    model: this.appMediaContent,
                    as: 'cover',
                    include: [
                        {
                            model: this.appMediaThumbnail,
                            as: 'thumbnails',
                        },
                    ],
                },
            ],
            where: {
                status: 'valid',
                visibility: 'public',
                ...extendedWhere,
            },
            order: orderOption,
        });
        return communitiesResult.map((c) => c.toJSON() as CommunityAttributes);
    }

    /**
     * @deprecated
     */
    public static async listFull(order?: string): Promise<ICommunity[]> {
        // by the time of writting, sequelize
        // does not support eager loading with global "raw: false".
        // Please, check again, and if available, update this
        // https://github.com/sequelize/sequelize/issues/6408
        let sqlQuery =
            'select * from community c ' +
            'left join ubi_community_daily_metrics cm on c.id = cm."communityId" and cm.date = (select date from ubi_community_daily_metrics order by date desc limit 1) ' +
            'left join ubi_community_contract cc on c.id = cc."communityId" ' +
            'left join ubi_community_state cs on c.id = cs."communityId" ' +
            "where c.visibility = 'public' and c.status = 'valid' ";
        switch (order) {
            case 'out_of_funds':
                // we can't devide by zero! ubiRate is never zero
                sqlQuery +=
                    'and cs.beneficiaries != 0 order by (cs.raised - cs.claimed) / cm."ubiRate" / cs.beneficiaries';
                break;

            case 'newest':
                sqlQuery += 'order by c.started desc';
                break;

            default:
                sqlQuery += 'order by cs.beneficiaries desc';
                break;
        }

        const rawResult: (CommunityAttributes &
            UbiCommunityState &
            UbiCommunityContract &
            UbiCommunityDailyMetrics)[] = await this.sequelize.query(sqlQuery, {
            type: QueryTypes.SELECT,
        });

        const results: any[] = rawResult.map((c) => ({
            id: c.id,
            publicId: c.publicId,
            requestByAddress: c.requestByAddress,
            contractAddress: c.contractAddress,
            name: c.name,
            description: c.description,
            descriptionEn: c.descriptionEn,
            language: c.language,
            currency: c.currency,
            city: c.city,
            country: c.country,
            gps: c.gps,
            email: c.email,
            visibility: c.visibility,
            coverImage: c.coverImage,
            coverMediaId: c.coverMediaId,
            status: c.status,
            started: c.started,
            contract: {
                baseInterval: c.baseInterval,
                claimAmount: c.claimAmount,
                incrementInterval: c.incrementInterval,
                maxClaim: c.maxClaim,
                // values below don't matter
                communityId: c.id,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
            },
            state: {
                backers: c.backers,
                beneficiaries: c.beneficiaries,
                removedBeneficiaries: c.removedBeneficiaries,
                managers: c.managers,
                claimed: c.claimed,
                claims: c.claims,
                raised: c.raised,
                // values below don't matter
                communityId: c.id,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
            },
            metrics:
                c.ssi !== null &&
                c.ubiRate !== null &&
                c.estimatedDuration !== null
                    ? {
                          date: c.date,
                          estimatedDuration: c.estimatedDuration,
                          ssi: c.ssi,
                          ssiDayAlone: c.ssiDayAlone,
                          ubiRate: c.ubiRate,
                          // values below don't matter
                          communityId: c.id,
                          createdAt: c.createdAt,
                          updatedAt: c.updatedAt,
                          id: 0,
                      }
                    : undefined,
            // values below don't matter
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
        }));

        return results;
    }

    /**
     * @deprecated Since mobile version 1.1.0
     */
    public static async listManagers(
        managerAddress: string,
        offset: number,
        limit: number
    ): Promise<IManagerDetailsManager[]> {
        return ManagerService.listManagers(managerAddress, offset, limit);
    }

    /**
     * @deprecated Since mobile version 1.1.0
     */
    public static async searchManager(
        managerAddress: string,
        beneficiaryQuery: string
    ): Promise<IManagerDetailsManager[]> {
        return await ManagerService.search(managerAddress, beneficiaryQuery);
    }

    /**
     * @deprecated Use `findById`
     */
    public static async getByPublicId(
        publicId: string
    ): Promise<Community | null> {
        return this.community.findOne({
            where: {
                publicId,
            },
        });
    }

    /**
     * @deprecated
     */
    public static async getByContractAddress(
        contractAddress: string
    ): Promise<ICommunity | null> {
        const community = await this.community.findOne({
            where: {
                contractAddress,
            },
            raw: true,
        });
        if (community === null) {
            throw new BaseError(
                'COMMUNITY_NOT_FOUND',
                'Not found community ' + contractAddress
            );
        }
        const communityState = await this.getState(community.id);
        const communityContract = await this.ubiCommunityContract.findOne({
            where: {
                communityId: community.id,
            },
            raw: true,
        });
        const communityDailyMetrics =
            await this.ubiCommunityDailyMetrics.findAll({
                where: {
                    communityId: community.id,
                },
                order: [['createdAt', 'DESC']],
                limit: 1,
                raw: true,
            });
        return {
            ...community,
            state: communityState!,
            contract: communityContract!,
            metrics: communityDailyMetrics[0]!,
        } as any;
    }

    public static async editSubmission(
        params: IBaseCommunityAttributes
    ): Promise<CommunityAttributes> {
        const t = await this.sequelize.transaction();
        try {
            const community = await this.community.findOne({
                attributes: ['id', 'coverMediaId'],
                where: {
                    requestByAddress: params.requestByAddress,
                    status: 'pending',
                },
            });

            if (community === null) {
                throw new BaseError(
                    'COMMUNITY_NOT_FOUND',
                    'community not found!'
                );
            }

            const {
                name,
                description,
                language,
                currency,
                city,
                country,
                gps,
                email,
                contractParams,
                coverMediaId,
            } = params;

            await this.community.update(
                {
                    name,
                    description,
                    language,
                    currency,
                    city,
                    country,
                    gps,
                    email,
                },
                {
                    where: {
                        id: community.id,
                    },
                    transaction: t,
                }
            );

            if (
                !!coverMediaId &&
                coverMediaId !== -1 &&
                community.coverMediaId !== coverMediaId
            ) {
                await this.communityContentStorage.deleteContent(
                    community.coverMediaId!
                );
                await this.community.update(
                    {
                        coverMediaId,
                    },
                    {
                        where: {
                            id: community.id,
                        },
                        transaction: t,
                    }
                );
            }

            if (contractParams) {
                await CommunityContractService.update(
                    community.id,
                    contractParams
                );
            }

            await t.commit();

            return this._findCommunityBy(
                { id: community.id },
                params.requestByAddress
            );
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    public static async deleteSubmission(
        managerAddress: string
    ): Promise<boolean> {
        try {
            const deleted = await this.community.destroy({
                where: {
                    requestByAddress: managerAddress,
                    status: 'pending',
                },
            });

            if (!deleted) {
                throw new BaseError(
                    'SUBMISSION_NOT_FOUND',
                    'Not found community submission'
                );
            }

            return true;
        } catch (error) {
            throw error;
        }
    }

    // PRIVATE METHODS

    private static async _findCommunityBy(
        where: WhereOptions<CommunityAttributes>,
        userAddress?: string
    ): Promise<CommunityAttributes> {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const community = await this.community.findOne({
            include: [
                {
                    model: this.appMediaContent,
                    as: 'cover',
                    include: [
                        {
                            model: this.appMediaThumbnail,
                            as: 'thumbnails',
                            separate: true,
                        },
                    ],
                },
            ],
            where,
        });
        if (community === null) {
            throw new BaseError(
                'COMMUNITY_NOT_FOUND',
                'Not found community ' + where
            );
        }
        const suspect = await this.getSuspect(community.id);
        const contract = (await this.getContract(community.id))!;
        const state = (await this.getState(community.id))!;
        const metrics = await this.getMetrics(community.id);

        let showEmail = false;
        if (userAddress) {
            const manager = await models.manager.findOne({
                attributes: ['communityId'],
                where: { address: userAddress, active: true },
            });
            if (manager !== null) {
                showEmail = manager.communityId === community.id;
            } else {
                showEmail =
                    community.status === 'pending' &&
                    community.requestByAddress === userAddress;
            }
        }

        return {
            ...(community.toJSON() as CommunityAttributes),
            email: showEmail ? community.email : '',
            suspect: suspect !== null ? [suspect] : undefined,
            contract,
            state,
            metrics: metrics !== null ? [metrics] : undefined,
        };
    }

    private static _generateInclude(fields: any): Includeable[] {
        const extendedInclude: Includeable[] = [];

        if (fields.suspect) {
            extendedInclude.push({
                model: this.ubiCommunitySuspect,
                attributes:
                    fields.suspect.length > 0 ? fields.suspect : undefined,
                as: 'suspect',
                required: false,
                duplicating: false,
                where: {
                    createdAt: {
                        [Op.eq]: literal(
                            '(select max("createdAt") from ubi_community_suspect ucs where ucs."communityId"="Community".id and date("createdAt") > (current_date - INTERVAL \'1 day\'))'
                        ),
                    } as { [Op.eq]: Literal },
                },
            });
        }

        if (fields.cover) {
            extendedInclude.push({
                attributes: ['id', 'url'],
                model: this.appMediaContent,
                as: 'cover',
                duplicating: false,
                include: [
                    {
                        attributes: ['url', 'width', 'height', 'pixelRatio'],
                        model: this.appMediaThumbnail,
                        as: 'thumbnails',
                        separate: true,
                    },
                ],
            });
        }

        if (fields.proposal) {
            extendedInclude.push({
                // all attributes
                model: models.appProposal,
                as: 'proposal',
            });
        }

        if (fields.contract) {
            extendedInclude.push({
                attributes:
                    fields.contract.length > 0 ? fields.contract : undefined,
                model: this.ubiCommunityContract,
                as: 'contract',
            });
        }

        if (fields.metrics) {
            const metricsAttributes = fields.metrics
                ? fields.metrics.length > 0
                    ? fields.metrics
                    : undefined
                : [];

            extendedInclude.push({
                attributes: metricsAttributes,
                model: this.ubiCommunityDailyMetrics,
                required: false,
                duplicating: false,
                as: 'metrics',
                where: {
                    date: {
                        [Op.eq]: literal(
                            '(select date from ubi_community_daily_metrics order by date desc limit 1)'
                        ),
                    } as { [Op.eq]: Literal },
                },
            });
        }

        return extendedInclude;
    }

    private static _oldInclude(extended?: string): Includeable[] {
        const extendedInclude: Includeable[] = [];
        const yesterdayDateOnly = new Date();
        yesterdayDateOnly.setUTCHours(0, 0, 0, 0);
        yesterdayDateOnly.setDate(yesterdayDateOnly.getDate() - 1);
        const yesterdayDate = yesterdayDateOnly.toISOString().split('T')[0];

        // TODO: deprecated in mobile@1.1.6
        if (extended) {
            extendedInclude.push(
                {
                    model: this.ubiCommunityContract,
                    as: 'contract',
                },
                {
                    model: this.ubiCommunityDailyMetrics,
                    required: false,
                    duplicating: false,
                    as: 'metrics',
                    where: {
                        date: {
                            [Op.eq]: literal(
                                '(select date from ubi_community_daily_metrics order by date desc limit 1)'
                            ),
                        } as { [Op.eq]: Literal },
                    },
                }
            );
        }

        return [
            {
                model: this.ubiCommunitySuspect,
                attributes: ['suspect'],
                as: 'suspect',
                required: false,
                duplicating: false,
                where: {
                    createdAt: {
                        [Op.eq]: literal(
                            '(select max("createdAt") from ubi_community_suspect ucs where ucs."communityId"="Community".id and date("createdAt") > (current_date - INTERVAL \'1 day\'))'
                        ),
                    },
                },
            },
            {
                model: this.appMediaContent,
                as: 'cover',
                duplicating: false,
                include: [
                    {
                        model: this.appMediaThumbnail,
                        as: 'thumbnails',
                        separate: true,
                    },
                ],
            },
            {
                attributes: { exclude: ['id', 'communityId'] },
                model: this.ubiCommunityDailyState,
                as: 'dailyState',
                duplicating: false,
                where: {
                    date: yesterdayDate,
                },
                required: false,
            },
            ...extendedInclude,
        ] as Includeable[];
    }

    private static async _getOutOfFunds(
        query: {
            limit?: string;
            offset?: string;
        },
        orderType?: string,
        communitiesId?: number[]
    ): Promise<[{ id: number }]> {
        const sql = `SELECT "Beneficiary".id
        FROM (
            SELECT "Community"."id", count(distinct("beneficiaries"."address")) AS "beneficiaries"
            FROM "community" AS "Community"
                INNER JOIN "beneficiary" AS "beneficiaries" ON "Community"."id" = "beneficiaries"."communityId" AND "beneficiaries"."active" = true
            WHERE ${
                !!communitiesId && communitiesId.length > 0
                    ? `"Community"."id" IN (${communitiesId.join()})`
                    : `"Community"."status" = 'valid' AND "Community"."visibility" = 'public'`
            }
            GROUP BY "Community"."id"
        ) AS "Beneficiary" INNER JOIN (
            SELECT "Community"."id", sum("claims"."amount") AS "claimed"
            FROM "community" AS "Community"
                INNER JOIN "ubi_claim" AS "claims" ON "Community"."id" = "claims"."communityId"
            WHERE "Community"."status" = 'valid' AND "Community"."visibility" = 'public'
            GROUP BY "Community"."id"
        ) AS "Claims" on "Claims".id = "Beneficiary".id INNER JOIN (
            SELECT "Community"."id", sum("inflow"."amount") AS "raised"
            FROM "community" AS "Community"
                INNER JOIN "inflow" AS "inflow" ON "Community"."contractAddress" = "inflow"."contractAddress"
            WHERE "Community"."status" = 'valid' AND "Community"."visibility" = 'public'
            GROUP BY "Community"."id"
        ) AS "Inflow" ON "Beneficiary".id = "Inflow".id INNER JOIN (
            SELECT "communityId", "ubiRate"
            FROM ubi_community_daily_metrics
            WHERE date = (
                SELECT date from ubi_community_daily_metrics order by date DESC limit 1
            )
        ) AS "Metrics" ON "Metrics"."communityId" = "Beneficiary".id
        WHERE "Beneficiary".beneficiaries != 0
        ORDER BY ("Inflow".raised - "Claims".claimed) / "Metrics"."ubiRate" / "Beneficiary".beneficiaries ${
            orderType ? orderType : 'ASC'
        }
        LIMIT ${
            query.limit ? parseInt(query.limit, 10) : config.defaultLimit
        } OFFSET ${
            query.offset ? parseInt(query.offset, 10) : config.defaultOffset
        }`;

        const result = (
            await this.sequelize.query(sql, {
                raw: true,
            })
        )[0] as [{ id: number }];

        return result;
    }

    private static async _getBeneficiaryState(
        query: {
            status?: string;
            limit?: string;
            offset?: string;
        },
        extendedWhere: WhereOptions<CommunityAttributes>,
        orderType?: string
    ): Promise<any> {
        const result = (await models.community.findAll({
            attributes: [
                'id',
                [
                    fn('count', fn('distinct', col('beneficiaries.address'))),
                    'beneficiaries',
                ],
            ],
            where: {
                status: query.status ? query.status : 'valid',
                visibility: 'public',
                ...extendedWhere,
            },
            include: [
                {
                    attributes: [],
                    model: models.beneficiary,
                    as: 'beneficiaries',
                    where: {
                        active: true,
                    },
                    duplicating: false,
                    required: false,
                },
            ],
            group: ['Community.id'],
            order: [
                [
                    literal('count("beneficiaries"."address")'),
                    orderType ? orderType : 'DESC',
                ],
            ],
            raw: true,
            offset: query.offset
                ? parseInt(query.offset, 10)
                : config.defaultOffset,
            limit: query.limit
                ? parseInt(query.limit, 10)
                : config.defaultLimit,
        })) as any;
        return result;
    }
}