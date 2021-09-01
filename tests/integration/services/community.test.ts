import { expect } from 'chai';
import faker from 'faker';
import { Sequelize } from 'sequelize';
import Sinon, { assert, replace, spy } from 'sinon';

import { AppMediaContent } from '../../../src/interfaces/app/appMediaContent';
import { User } from '../../../src/interfaces/app/user';
import { UbiPromoter } from '../../../src/interfaces/ubi/ubiPromoter';
import { CommunityContentStorage } from '../../../src/services/storage';
import CommunityService from '../../../src/services/ubi/community';
import BeneficiaryFactory from '../../factories/beneficiary';
import CommunityFactory from '../../factories/community';
import ManagerFactory from '../../factories/manager';
import UserFactory from '../../factories/user';
import truncate, { sequelizeSetup } from '../../utils/sequelizeSetup';

// in this test there are users being assined with suspicious activity and others being removed
describe('community service', () => {
    let sequelize: Sequelize;
    let users: User[];
    let communityContentStorageDelete: Sinon.SinonSpy<[number], Promise<void>>;
    before(async () => {
        sequelize = sequelizeSetup();
        await sequelize.sync();
        users = await UserFactory({ n: 5 });

        replace(
            CommunityContentStorage.prototype,
            'deleteContent',
            async (mediaId: number) => {
                //
            }
        );

        communityContentStorageDelete = spy(
            CommunityContentStorage.prototype,
            'deleteContent'
        );
    });

    describe('list', () => {
        afterEach(async () => {
            await truncate(sequelize, 'Beneficiary');
            await truncate(sequelize);
        });

        describe('by name', () => {
            afterEach(async () => {
                await truncate(sequelize, 'Community');
            });

            it('full name', async () => {
                const communities = await CommunityFactory([
                    {
                        requestByAddress: users[0].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                    },
                ]);

                const result = await CommunityService.list({
                    name: communities[0].name,
                });

                expect(result.rows[0]).to.include({
                    id: communities[0].id,
                    name: communities[0].name,
                    country: communities[0].country,
                    requestByAddress: users[0].address,
                });
            });

            it('first half name', async () => {
                const communities = await CommunityFactory([
                    {
                        requestByAddress: users[0].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                    },
                ]);

                const result = await CommunityService.list({
                    name: communities[0].name.slice(
                        0,
                        communities[0].name.length / 2
                    ),
                });

                expect(result.rows[0]).to.include({
                    id: communities[0].id,
                    name: communities[0].name,
                    country: communities[0].country,
                    requestByAddress: users[0].address,
                });
            });

            it('last half name', async () => {
                const communities = await CommunityFactory([
                    {
                        requestByAddress: users[0].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                    },
                ]);

                const result = await CommunityService.list({
                    name: communities[0].name.slice(
                        communities[0].name.length / 2,
                        communities[0].name.length - 1
                    ),
                });

                expect(result.rows[0]).to.include({
                    id: communities[0].id,
                    name: communities[0].name,
                    country: communities[0].country,
                    requestByAddress: users[0].address,
                });
            });

            it('UPPERCASE name', async () => {
                const communities = await CommunityFactory([
                    {
                        requestByAddress: users[0].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                    },
                ]);

                const result = await CommunityService.list({
                    name: communities[0].name.toUpperCase(),
                });

                expect(result.rows[0]).to.include({
                    id: communities[0].id,
                    name: communities[0].name,
                    country: communities[0].country,
                    requestByAddress: users[0].address,
                });
            });

            it('two with similar name', async () => {
                const communities = await CommunityFactory([
                    {
                        requestByAddress: users[0].address,
                        name: 'oreoland', // no space on purpose
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                    },
                    {
                        requestByAddress: users[1].address,
                        name: 'oreo sea',
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                    },
                    {
                        requestByAddress: users[2].address,
                        name: 'itsdifferent',
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                    },
                ]);

                const result = await CommunityService.list({
                    name: 'oreo',
                });

                expect(result.count).to.be.equal(2);

                expect(result.rows[0]).to.include({
                    id: communities[0].id,
                    name: communities[0].name,
                    country: communities[0].country,
                    requestByAddress: users[0].address,
                });

                expect(result.rows[1]).to.include({
                    id: communities[1].id,
                    name: communities[1].name,
                    country: communities[1].country,
                    requestByAddress: users[1].address,
                });
            });

            it('list all communities', async () => {
                const communities = await CommunityFactory([
                    {
                        requestByAddress: users[0].address,
                        name: 'oreoland', // no space on purpose
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                    },
                    {
                        requestByAddress: users[1].address,
                        name: 'oreo sea',
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                    },
                ]);

                const result = await CommunityService.list({});

                result.rows.forEach((el) => {
                    expect(el.email).to.be.undefined;
                });
            });
        });

        describe('by country', () => {
            afterEach(async () => {
                await truncate(sequelize, 'Community');
            });

            it('single country', async () => {
                const communities = await CommunityFactory([
                    {
                        requestByAddress: users[0].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                        country: 'PT',
                    },
                    {
                        requestByAddress: users[1].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                        country: 'PT',
                    },
                    {
                        requestByAddress: users[2].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                        country: 'ES',
                    },
                ]);

                const result = await CommunityService.list({ country: 'PT' });

                expect(result.count).to.be.equal(2);
                (expect(result.rows).to as any).containSubset([
                    {
                        id: communities[0].id,
                    },
                    {
                        id: communities[1].id,
                    },
                ]);
            });

            it('many country', async () => {
                const communities = await CommunityFactory([
                    {
                        requestByAddress: users[0].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                        country: 'PT',
                    },
                    {
                        requestByAddress: users[1].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                        country: 'PT',
                    },
                    {
                        requestByAddress: users[2].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                        country: 'ES',
                    },
                    {
                        requestByAddress: users[3].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                        country: 'FR',
                    },
                    {
                        requestByAddress: users[4].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                        country: 'MZ',
                    },
                ]);

                const result = await CommunityService.list({
                    country: 'PT;ES;FR',
                });

                expect(result.count).to.be.equal(4);
                (expect(result.rows).to as any).containSubset([
                    {
                        id: communities[0].id,
                    },
                    {
                        id: communities[1].id,
                    },
                    {
                        id: communities[2].id,
                    },
                    {
                        id: communities[3].id,
                    },
                ]);
            });
        });

        it('large lists', async () => {
            const totalCommunities = 80;
            const communityManagers = await UserFactory({
                n: totalCommunities,
            });
            const createObject: any[] = [];
            for (let index = 0; index < totalCommunities; index++) {
                createObject.push({
                    requestByAddress: communityManagers[index].address,
                    started: new Date(),
                    status: 'valid',
                    visibility: 'public',
                    contract: {
                        baseInterval: 60 * 60 * 24,
                        claimAmount: '1000000000000000000',
                        communityId: 0,
                        incrementInterval: 5 * 60,
                        maxClaim: '450000000000000000000',
                    },
                    hasAddress: true,
                });
            }
            const communities = await CommunityFactory(createObject);

            for (const community of communities) {
                await BeneficiaryFactory(
                    await UserFactory({
                        n: Math.floor(Math.random() * 20),
                    }),
                    community.publicId
                );
            }

            //

            const result: any[] = [];

            for (let index = 0; index < totalCommunities / 5; index++) {
                const r = await CommunityService.list({
                    offset: (index * 5).toString(),
                    limit: '5',
                });
                expect(result).to.not.have.members(r.rows);
                result.push(r.rows);
            }
        }).timeout(120000); // exceptionally 120s timeout

        describe('sort', () => {
            afterEach(async () => {
                await truncate(sequelize, 'Beneficiary');
                await truncate(sequelize, 'Community');
            });

            it('without query parameters (most beneficiaries)', async () => {
                const communities = await CommunityFactory([
                    {
                        requestByAddress: users[0].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214,
                        },
                    },
                    {
                        requestByAddress: users[1].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214,
                        },
                    },
                ]);

                for (const community of communities) {
                    await BeneficiaryFactory(
                        await UserFactory({
                            n:
                                community.requestByAddress === users[0].address
                                    ? 3
                                    : 4,
                        }),
                        community.publicId
                    );
                }

                const result = await CommunityService.list({});

                expect(result.rows[0]).to.include({
                    id: communities[1].id,
                    name: communities[1].name,
                    country: communities[1].country,
                    requestByAddress: users[1].address,
                });
                expect(result.rows[1]).to.include({
                    id: communities[0].id,
                    name: communities[0].name,
                    country: communities[0].country,
                    requestByAddress: users[0].address,
                });
            });

            it('nearest', async () => {
                const communities = await CommunityFactory([
                    {
                        requestByAddress: users[0].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -15.8697203,
                            longitude: -47.9207824,
                        },
                    },
                    {
                        requestByAddress: users[1].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214,
                        },
                    },
                ]);

                const result = await CommunityService.list({
                    orderBy: 'nearest',
                    lat: '-23.4378873',
                    lng: '-46.4841214',
                });

                expect(result.rows[0]).to.include({
                    id: communities[1].id,
                    name: communities[1].name,
                    country: communities[1].country,
                    requestByAddress: users[1].address,
                });
            });

            it('nearest and most beneficiaries', async () => {
                const communities = await CommunityFactory([
                    {
                        requestByAddress: users[0].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214,
                        },
                    },
                    {
                        requestByAddress: users[1].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214,
                        },
                    },
                    {
                        requestByAddress: users[2].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -15.8697203,
                            longitude: -47.9207824,
                        },
                    },
                ]);

                for (const community of communities) {
                    await BeneficiaryFactory(
                        await UserFactory({
                            n:
                                community.requestByAddress === users[1].address
                                    ? 5
                                    : 4,
                        }),
                        community.publicId
                    );
                }

                const result = await CommunityService.list({
                    orderBy: 'nearest:ASC;bigger:DESC',
                    lat: '-15.8697203',
                    lng: '-47.9207824',
                });

                expect(result.rows[0]).to.include({
                    id: communities[2].id,
                    name: communities[2].name,
                    country: communities[2].country,
                    requestByAddress: users[2].address,
                });
                expect(result.rows[1]).to.include({
                    id: communities[1].id,
                    name: communities[1].name,
                    country: communities[1].country,
                    requestByAddress: users[1].address,
                });
                expect(result.rows[2]).to.include({
                    id: communities[0].id,
                    name: communities[0].name,
                    country: communities[0].country,
                    requestByAddress: users[0].address,
                });
            });

            it('fewer beneficiaries and farthest', async () => {
                const communities = await CommunityFactory([
                    {
                        requestByAddress: users[0].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214,
                        },
                    },
                    {
                        requestByAddress: users[1].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -33.2799527,
                            longitude: 9.1421702,
                        },
                    },
                    {
                        requestByAddress: users[2].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -15.8697203,
                            longitude: -47.9207824,
                        },
                    },
                ]);

                for (const community of communities) {
                    await BeneficiaryFactory(
                        await UserFactory({
                            n:
                                community.requestByAddress === users[2].address
                                    ? 3
                                    : 4,
                        }),
                        community.publicId
                    );
                }

                const result = await CommunityService.list({
                    orderBy: 'bigger:ASC;nearest:DESC',
                    lat: '-15.8697203',
                    lng: '-47.9207824',
                });

                expect(result.rows[0]).to.include({
                    id: communities[2].id,
                    name: communities[2].name,
                    country: communities[2].country,
                    requestByAddress: users[2].address,
                });
                expect(result.rows[1]).to.include({
                    id: communities[1].id,
                    name: communities[1].name,
                    country: communities[1].country,
                    requestByAddress: users[1].address,
                });
                expect(result.rows[2]).to.include({
                    id: communities[0].id,
                    name: communities[0].name,
                    country: communities[0].country,
                    requestByAddress: users[0].address,
                });
            });
        });
    });

    describe('campaign', () => {
        let communityId: number;
        before(async () => {
            const communities = await CommunityFactory([
                {
                    requestByAddress: users[0].address,
                    started: new Date(),
                    status: 'valid',
                    visibility: 'public',
                    contract: {
                        baseInterval: 60 * 60 * 24,
                        claimAmount: '1000000000000000000',
                        communityId: 0,
                        incrementInterval: 5 * 60,
                        maxClaim: '450000000000000000000',
                    },
                    hasAddress: true,
                },
            ]);
            communityId = communities[0].id;
        });

        after(async () => {
            await truncate(sequelize, 'Community');
            await truncate(sequelize);
        });

        it('community without campaign', async () => {
            const result = await CommunityService.getCampaign(communityId);
            // eslint-disable-next-line no-unused-expressions
            expect(result).to.be.null;
        });

        it('community with campaign', async () => {
            const campaignUrl = faker.internet.url();
            await sequelize.models.UbiCommunityCampaignModel.create({
                communityId,
                campaignUrl,
            });

            const result = await CommunityService.getCampaign(communityId);
            // eslint-disable-next-line no-unused-expressions
            expect(result).to.not.be.null;
            expect(result).to.include({
                communityId,
                campaignUrl,
            });
        });
    });

    describe('count', () => {
        describe('by country', () => {
            afterEach(async () => {
                await truncate(sequelize, 'Community');
            });

            it('full name', async () => {
                await CommunityFactory([
                    {
                        requestByAddress: users[0].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                        country: 'PT',
                    },
                    {
                        requestByAddress: users[1].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                        country: 'PT',
                    },
                    {
                        requestByAddress: users[2].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: '1000000000000000000',
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: '450000000000000000000',
                        },
                        hasAddress: true,
                        country: 'ES',
                    },
                ]);

                const result = await CommunityService.count('country');

                (expect(result).to as any).containSubset([
                    {
                        country: 'PT',
                        count: '2',
                    },
                    {
                        country: 'ES',
                        count: '1',
                    },
                ]);
            });
        });
    });

    describe('edit', () => {
        afterEach(async () => {
            await truncate(sequelize, 'Manager');
            await truncate(sequelize);
        });

        it('without media', async () => {
            const communities = await CommunityFactory([
                {
                    requestByAddress: users[0].address,
                    started: new Date(),
                    status: 'valid',
                    visibility: 'public',
                    contract: {
                        baseInterval: 60 * 60 * 24,
                        claimAmount: '1000000000000000000',
                        communityId: 0,
                        incrementInterval: 5 * 60,
                        maxClaim: '450000000000000000000',
                    },
                    hasAddress: true,
                },
            ]);

            const communityNewDescription =
                'bla bla bla, this community to the moon!';
            const updatedCommunity = await CommunityService.edit(
                communities[0].id,
                {
                    currency: communities[0].currency,
                    description: communityNewDescription,
                    name: communities[0].name,
                    coverMediaId: -1,
                }
            );

            expect(updatedCommunity.description).to.be.equal(
                communityNewDescription
            );

            assert.callCount(communityContentStorageDelete, 0);
            expect(updatedCommunity.coverMediaId).to.not.be.equal(-1);
            expect(updatedCommunity.coverMediaId).to.be.equal(
                communities[0].coverMediaId
            );
        });

        it('with media', async () => {
            const communities = await CommunityFactory([
                {
                    requestByAddress: users[0].address,
                    started: new Date(),
                    status: 'valid',
                    visibility: 'public',
                    contract: {
                        baseInterval: 60 * 60 * 24,
                        claimAmount: '1000000000000000000',
                        communityId: 0,
                        incrementInterval: 5 * 60,
                        maxClaim: '450000000000000000000',
                    },
                    hasAddress: true,
                },
            ]);

            const communityNewDescription =
                'bla bla bla, this community to the moon!';
            const updatedCommunity = await CommunityService.edit(
                communities[0].id,
                {
                    currency: communities[0].currency,
                    description: communityNewDescription,
                    name: communities[0].name,
                    coverMediaId: 1,
                }
            );

            expect(updatedCommunity.description).to.be.equal(
                communityNewDescription
            );

            assert.callCount(communityContentStorageDelete, 1);
            expect(updatedCommunity.coverMediaId).to.not.be.equal(
                communities[0].coverMediaId
            );
            expect(updatedCommunity.coverMediaId).to.be.equal(1);
        });

        it('update email', async () => {
            const manager = await UserFactory({ n: 1 });

            const communities = await CommunityFactory([
                {
                    requestByAddress: manager[0].address,
                    started: new Date(),
                    status: 'valid',
                    visibility: 'public',
                    contract: {
                        baseInterval: 60 * 60 * 24,
                        claimAmount: '1000000000000000000',
                        communityId: 0,
                        incrementInterval: 5 * 60,
                        maxClaim: '450000000000000000000',
                    },
                    hasAddress: true,
                },
            ]);

            await ManagerFactory([manager[0]], communities[0].publicId);

            const communityNewDescription =
                'bla bla bla, this community to the moon!';
            const updatedCommunity = await CommunityService.edit(
                communities[0].id,
                {
                    currency: communities[0].currency,
                    description: communityNewDescription,
                    name: communities[0].name,
                    coverMediaId: 1,
                    email: 'test@gmail.com',
                },
                manager[0].address
            );

            expect(updatedCommunity.description).to.be.equal(
                communityNewDescription
            );
            expect(updatedCommunity.coverMediaId).to.be.equal(1);
            expect(updatedCommunity.email).to.be.equal('test@gmail.com');
        });
    });

    describe('promoter', () => {
        afterEach(async () => {
            await truncate(sequelize, 'UbiPromoterModel');
            await truncate(sequelize);
        });

        it('get promoter', async () => {
            const communities = await CommunityFactory([
                {
                    requestByAddress: users[0].address,
                    started: new Date(),
                    status: 'valid',
                    visibility: 'public',
                    contract: {
                        baseInterval: 60 * 60 * 24,
                        claimAmount: '1000000000000000000',
                        communityId: 0,
                        incrementInterval: 5 * 60,
                        maxClaim: '450000000000000000000',
                    },
                    hasAddress: true,
                },
            ]);

            const createdMedia =
                await sequelize.models.AppMediaContentModel.create({
                    url: faker.image.imageUrl(),
                    width: 0,
                    height: 0,
                });

            const name = faker.company.companyName();
            const description = faker.lorem.sentence();
            const media = createdMedia.toJSON() as AppMediaContent;
            const createdPromoter =
                await sequelize.models.UbiPromoterModel.create({
                    category: 'organization',
                    name,
                    description,
                    logoMediaId: media.id, // on purpose
                });

            const promoter = createdPromoter.toJSON() as UbiPromoter;
            await sequelize.models.UbiCommunityPromoterModel.create({
                promoterId: promoter.id,
                communityId: communities[0].id,
            });
            const result: UbiPromoter | null =
                await CommunityService.getPromoter(communities[0].id);
            // eslint-disable-next-line no-unused-expressions
            expect(result).to.not.be.null;
            expect(result!.name).to.be.equal(name);
            expect(result!.description).to.be.equal(description);
        });
    });

    describe('find', () => {
        afterEach(async () => {
            await truncate(sequelize, 'Manager');
            await truncate(sequelize);
        });

        it('find by id - manager request', async () => {
            const manager = await UserFactory({ n: 1 });

            const communities = await CommunityFactory([
                {
                    requestByAddress: manager[0].address,
                    started: new Date(),
                    status: 'valid',
                    visibility: 'public',
                    contract: {
                        baseInterval: 60 * 60 * 24,
                        claimAmount: '1000000000000000000',
                        communityId: 0,
                        incrementInterval: 5 * 60,
                        maxClaim: '450000000000000000000',
                    },
                    hasAddress: true,
                },
            ]);

            await ManagerFactory([manager[0]], communities[0].publicId);

            const result = await CommunityService.findById(
                communities[0].id,
                manager[0].address
            );

            expect(result.publicId).to.be.equal(communities[0].publicId);
            expect(result.email).to.be.equal(communities[0].email);
        });

        it('find by id - common user request', async () => {
            const manager = await UserFactory({ n: 1 });

            const communities = await CommunityFactory([
                {
                    requestByAddress: manager[0].address,
                    started: new Date(),
                    status: 'valid',
                    visibility: 'public',
                    contract: {
                        baseInterval: 60 * 60 * 24,
                        claimAmount: '1000000000000000000',
                        communityId: 0,
                        incrementInterval: 5 * 60,
                        maxClaim: '450000000000000000000',
                    },
                    hasAddress: true,
                },
            ]);

            await ManagerFactory([manager[0]], communities[0].publicId);

            const result = await CommunityService.findById(communities[0].id);

            expect(result.publicId).to.be.equal(communities[0].publicId);
            expect(result.email).to.be.equal('');
        });

        it('find by Contract Address - manager request', async () => {
            const manager = await UserFactory({ n: 1 });

            const communities = await CommunityFactory([
                {
                    requestByAddress: manager[0].address,
                    started: new Date(),
                    status: 'valid',
                    visibility: 'public',
                    contract: {
                        baseInterval: 60 * 60 * 24,
                        claimAmount: '1000000000000000000',
                        communityId: 0,
                        incrementInterval: 5 * 60,
                        maxClaim: '450000000000000000000',
                    },
                    hasAddress: true,
                },
            ]);

            await ManagerFactory([manager[0]], communities[0].publicId);

            const result = await CommunityService.findByContractAddress(
                communities[0].contractAddress!,
                manager[0].address
            );

            expect(result.publicId).to.be.equal(communities[0].publicId);
            expect(result.email).to.be.equal(communities[0].email);
        });

        it('find by Contract Address - common user request', async () => {
            const manager = await UserFactory({ n: 1 });

            const communities = await CommunityFactory([
                {
                    requestByAddress: manager[0].address,
                    started: new Date(),
                    status: 'valid',
                    visibility: 'public',
                    contract: {
                        baseInterval: 60 * 60 * 24,
                        claimAmount: '1000000000000000000',
                        communityId: 0,
                        incrementInterval: 5 * 60,
                        maxClaim: '450000000000000000000',
                    },
                    hasAddress: true,
                },
            ]);

            await ManagerFactory([manager[0]], communities[0].publicId);

            const result = await CommunityService.findByContractAddress(
                communities[0].contractAddress!
            );

            expect(result.publicId).to.be.equal(communities[0].publicId);
            expect(result.email).to.be.equal('');
        });
    });
});
