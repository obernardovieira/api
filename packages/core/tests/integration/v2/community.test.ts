import { Sequelize } from 'sequelize';
import { SinonStub, replace, restore, stub } from 'sinon';
import { ethers } from 'ethers';
import { expect, use } from 'chai';
import chaiSubset from 'chai-subset';
import crypto from 'crypto';

import * as subgraph from '../../../src/subgraph/queries/community';
import * as userSubgraph from '../../../src/subgraph/queries/user';
import { AppUser } from '../../../src/interfaces/app/appUser';
import { CommunityCreateService } from '../../../src/services/ubi/community/create';
import { CommunityDetailsService } from '../../../src/services/ubi/community/details';
import { CommunityListService } from '../../../src/services/ubi/community/list';
import { sequelize as database, models } from '../../../src/database';
import { sequelizeSetup, truncate } from '../../config/sequelizeSetup';
import CommunityFactory from '../../factories/community';
import UserFactory from '../../factories/user';

use(chaiSubset);

describe('community service v2', () => {
    let sequelize: Sequelize;
    let users: AppUser[];
    let returnProposalsSubgraph: SinonStub;
    let returnAmbassadorByAddressSubgraph: SinonStub;
    let returnClaimedSubgraph: SinonStub;
    let returnCommunityStateSubgraph: SinonStub;
    let returnCommunityEntities: SinonStub;
    let returnUserRoleSubgraph: SinonStub;

    type SubgraphClaimed = { id: string; claimed: number }[];

    const communityListService = new CommunityListService();
    const communityDetailsService = new CommunityDetailsService();
    const communityCreateService = new CommunityCreateService();

    before(async () => {
        sequelize = sequelizeSetup();
        await sequelize.sync();
        users = await UserFactory({ n: 5 });
        replace(database, 'query', sequelize.query);

        returnProposalsSubgraph = stub(subgraph, 'getCommunityProposal');
        returnCommunityEntities = stub(subgraph, 'communityEntities');
        returnClaimedSubgraph = stub(subgraph, 'getClaimed');
        returnAmbassadorByAddressSubgraph = stub(subgraph, 'getAmbassadorByAddress');
        returnCommunityStateSubgraph = stub(subgraph, 'getCommunityState');
        returnCommunityStateSubgraph.returns([
            {
                claims: 0,
                claimed: '0',
                beneficiaries: 0,
                removedBeneficiaries: 0,
                contributed: '0',
                contributors: 0,
                managers: 0
            }
        ]);
        returnUserRoleSubgraph = stub(userSubgraph, 'getUserRoles');
    });

    after(() => {
        restore();
    });

    describe('list', () => {
        afterEach(async () => {
            returnClaimedSubgraph.resetHistory();
            returnCommunityEntities.resetHistory();
            returnUserRoleSubgraph.resetHistory();
        });

        describe('by name', () => {
            afterEach(async () => {
                await truncate(sequelize, 'community');
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
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true
                    }
                ]);

                returnCommunityEntities.returns([
                    {
                        id: communities[0].contractAddress,
                        beneficiaries: 0
                    }
                ]);

                returnClaimedSubgraph.returns([
                    {
                        id: communities[0].contractAddress,
                        claimed: 0
                    }
                ]);

                const result = await communityListService.list({
                    search: communities[0].name
                });

                expect(result.rows[0]).to.include({
                    id: communities[0].id,
                    name: communities[0].name,
                    country: communities[0].country,
                    requestByAddress: users[0].address
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
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true
                    }
                ]);

                returnCommunityEntities.returns([
                    {
                        id: communities[0].contractAddress,
                        beneficiaries: 0
                    }
                ]);

                returnClaimedSubgraph.returns([
                    {
                        id: communities[0].contractAddress,
                        claimed: 0
                    }
                ]);

                const result = await communityListService.list({
                    search: communities[0].name.slice(0, communities[0].name.length / 2)
                });

                expect(result.rows[0]).to.include({
                    id: communities[0].id,
                    name: communities[0].name,
                    country: communities[0].country,
                    requestByAddress: users[0].address
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
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true
                    }
                ]);

                returnCommunityEntities.returns([
                    {
                        id: communities[0].contractAddress,
                        beneficiaries: 0
                    }
                ]);

                returnClaimedSubgraph.returns([
                    {
                        id: communities[0].contractAddress,
                        claimed: 0
                    }
                ]);

                const result = await communityListService.list({
                    search: communities[0].name.slice(communities[0].name.length / 2, communities[0].name.length - 1)
                });

                expect(result.rows[0]).to.include({
                    id: communities[0].id,
                    name: communities[0].name,
                    country: communities[0].country,
                    requestByAddress: users[0].address
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
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true
                    }
                ]);

                returnCommunityEntities.returns([
                    {
                        id: communities[0].contractAddress,
                        beneficiaries: 0
                    }
                ]);

                returnClaimedSubgraph.returns([
                    {
                        id: communities[0].contractAddress,
                        claimed: 0
                    }
                ]);

                const result = await communityListService.list({
                    search: communities[0].name.toUpperCase()
                });

                expect(result.rows[0]).to.include({
                    id: communities[0].id,
                    name: communities[0].name,
                    country: communities[0].country,
                    requestByAddress: users[0].address
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
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true
                    },
                    {
                        requestByAddress: users[1].address,
                        name: 'oreo sea',
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true
                    },
                    {
                        requestByAddress: users[2].address,
                        name: 'itsdifferent',
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true
                    }
                ]);

                returnCommunityEntities.returns(
                    communities.map(el => ({
                        id: el.contractAddress,
                        beneficiaries: 0
                    }))
                );

                returnClaimedSubgraph.returns(
                    communities.map(community => ({
                        id: community.contractAddress!,
                        claimed: 0
                    }))
                );

                const result = await communityListService.list({
                    search: 'oreo'
                });

                expect(result.count).to.be.equal(2);

                expect(result.rows[0]).to.include({
                    id: communities[0].id,
                    name: communities[0].name,
                    country: communities[0].country,
                    requestByAddress: users[0].address
                });

                expect(result.rows[1]).to.include({
                    id: communities[1].id,
                    name: communities[1].name,
                    country: communities[1].country,
                    requestByAddress: users[1].address
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
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true
                    },
                    {
                        requestByAddress: users[1].address,
                        name: 'oreo sea',
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true
                    }
                ]);

                returnCommunityEntities.returns(
                    communities.map(el => ({
                        id: el.contractAddress,
                        beneficiaries: 0
                    }))
                );

                returnClaimedSubgraph.returns(
                    communities.map(community => ({
                        id: community.contractAddress!,
                        claimed: 0
                    }))
                );

                const result = await communityListService.list({});

                result.rows.forEach(el => {
                    // eslint-disable-next-line no-unused-expressions
                    expect(el.email).to.be.undefined;
                });
            });
        });

        describe('by country', () => {
            afterEach(async () => {
                await truncate(sequelize, 'community');
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
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        country: 'PT'
                    },
                    {
                        requestByAddress: users[1].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        country: 'PT'
                    },
                    {
                        requestByAddress: users[2].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        country: 'ES'
                    }
                ]);

                returnCommunityEntities.returns(
                    communities.map(el => ({
                        id: el.contractAddress,
                        beneficiaries: 0
                    }))
                );

                returnClaimedSubgraph.returns(
                    communities.map(community => ({
                        id: community.contractAddress!,
                        claimed: 0
                    }))
                );

                const result = await communityListService.list({
                    country: 'PT'
                });

                expect(result.count).to.be.equal(2);
                (expect(result.rows).to as any).containSubset([
                    {
                        id: communities[0].id
                    },
                    {
                        id: communities[1].id
                    }
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
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        country: 'PT'
                    },
                    {
                        requestByAddress: users[1].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        country: 'PT'
                    },
                    {
                        requestByAddress: users[2].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        country: 'ES'
                    },
                    {
                        requestByAddress: users[3].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        country: 'FR'
                    },
                    {
                        requestByAddress: users[4].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        country: 'MZ'
                    }
                ]);

                returnCommunityEntities.returns(
                    communities.map(el => ({
                        id: el.contractAddress,
                        beneficiaries: 0
                    }))
                );

                returnClaimedSubgraph.returns(
                    communities.map(community => ({
                        id: community.contractAddress!,
                        claimed: 0
                    }))
                );

                const result = await communityListService.list({
                    country: 'PT;ES;FR'
                });

                expect(result.count).to.be.equal(4);
                (expect(result.rows).to as any).containSubset([
                    {
                        id: communities[0].id
                    },
                    {
                        id: communities[1].id
                    },
                    {
                        id: communities[2].id
                    },
                    {
                        id: communities[3].id
                    }
                ]);
            });
        });

        it('by requestedByAddress', async () => {
            const communities = await CommunityFactory([
                {
                    requestByAddress: users[1].address,
                    started: new Date(),
                    status: 'valid',
                    visibility: 'public',
                    contract: {
                        baseInterval: 60 * 60 * 24,
                        claimAmount: 1,
                        communityId: 0,
                        incrementInterval: 5 * 60,
                        maxClaim: 450
                    },
                    hasAddress: true
                }
            ]);

            returnCommunityEntities.returns([
                {
                    id: communities[0].contractAddress,
                    beneficiaries: 0
                }
            ]);

            returnClaimedSubgraph.returns([
                {
                    id: communities[0].contractAddress,
                    claimed: 0
                }
            ]);

            const result = await communityListService.list({
                search: users[1].address
            });

            expect(result.rows[0]).to.include({
                id: communities[0].id,
                name: communities[0].name,
                country: communities[0].country,
                requestByAddress: users[1].address
            });
        });

        it('large lists', async () => {
            const totalCommunities = 80;
            const communityManagers = await UserFactory({
                n: totalCommunities
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
                        claimAmount: 1,
                        communityId: 0,
                        incrementInterval: 5 * 60,
                        maxClaim: 450
                    },
                    hasAddress: true
                });
            }
            const communities = await CommunityFactory(createObject);
            const claimed: SubgraphClaimed = [];
            for (const community of communities) {
                claimed.push({
                    id: community.contractAddress!,
                    claimed: 0
                });
            }

            returnCommunityEntities.returns(
                communities.map(el => ({
                    id: el.contractAddress,
                    beneficiaries: 1
                }))
            );

            returnClaimedSubgraph.returns(claimed);

            //

            const result: any[] = [];

            for (let index = 0; index < totalCommunities / 5; index++) {
                const r = await communityListService.list({
                    offset: (index * 5).toString(),
                    limit: '5'
                });
                expect(result).to.not.have.members(r.rows);
                result.push(r.rows);
            }
        }).timeout(120000); // exceptionally 120s timeout

        describe('sort', () => {
            afterEach(async () => {
                await truncate(sequelize, 'community');
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
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214
                        }
                    },
                    {
                        requestByAddress: users[1].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214
                        }
                    }
                ]);

                const claimed: SubgraphClaimed = [];
                for (const community of communities) {
                    claimed.push({
                        id: community.contractAddress!,
                        claimed: 0
                    });
                }

                returnCommunityEntities.returns([
                    {
                        id: communities[1].contractAddress,
                        beneficiaries: 4
                    },
                    {
                        id: communities[0].contractAddress,
                        beneficiaries: 3
                    }
                ]);
                communities.forEach(el => {
                    returnCommunityStateSubgraph.withArgs(el.contractAddress).returns({
                        claims: 0,
                        claimed: '0',
                        beneficiaries: el.requestByAddress === users[0].address ? 3 : 4,
                        removedBeneficiaries: 0,
                        contributed: '0',
                        contributors: 0,
                        managers: 0
                    });
                });

                const result = await communityListService.list({});

                expect(result.rows[0]).to.include({
                    id: communities[1].id,
                    name: communities[1].name,
                    country: communities[1].country,
                    requestByAddress: users[1].address
                });
                expect(result.rows[1]).to.include({
                    id: communities[0].id,
                    name: communities[0].name,
                    country: communities[0].country,
                    requestByAddress: users[0].address
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
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -15.8697203,
                            longitude: -47.9207824
                        }
                    },
                    {
                        requestByAddress: users[1].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214
                        }
                    }
                ]);

                returnClaimedSubgraph.returns(
                    communities.map(community => ({
                        id: community.contractAddress!,
                        claimed: 0
                    }))
                );

                const result = await communityListService.list({
                    orderBy: 'nearest',
                    lat: '-23.4378873',
                    lng: '-46.4841214'
                });

                expect(result.rows[0]).to.include({
                    id: communities[1].id,
                    name: communities[1].name,
                    country: communities[1].country,
                    requestByAddress: users[1].address
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
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214
                        }
                    },
                    {
                        requestByAddress: users[1].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214
                        }
                    },
                    {
                        requestByAddress: users[2].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -15.8697203,
                            longitude: -47.9207824
                        }
                    }
                ]);

                const claimed: SubgraphClaimed = [];
                for (const community of communities) {
                    claimed.push({
                        id: community.contractAddress!,
                        claimed: 0
                    });
                }

                returnCommunityEntities.returns([
                    {
                        id: communities[1].contractAddress,
                        beneficiaries: 5
                    },
                    {
                        id: communities[0].contractAddress,
                        beneficiaries: 4
                    },
                    {
                        id: communities[2].contractAddress,
                        beneficiaries: 4
                    }
                ]);

                communities.forEach(el => {
                    returnCommunityStateSubgraph.withArgs(el.contractAddress).returns({
                        claims: 0,
                        claimed: '0',
                        beneficiaries: el.requestByAddress === users[1].address ? 5 : 4,
                        removedBeneficiaries: 0,
                        contributed: '0',
                        contributors: 0,
                        managers: 0
                    });
                });

                const result = await communityListService.list({
                    orderBy: 'nearest:ASC;bigger:DESC',
                    lat: '-15.8697203',
                    lng: '-47.9207824'
                });

                expect(result.rows[0]).to.include({
                    id: communities[1].id,
                    name: communities[1].name,
                    country: communities[1].country,
                    requestByAddress: users[1].address
                });
                expect(result.rows[1]).to.include({
                    id: communities[0].id,
                    name: communities[0].name,
                    country: communities[0].country,
                    requestByAddress: users[0].address
                });
                expect(result.rows[2]).to.include({
                    id: communities[2].id,
                    name: communities[2].name,
                    country: communities[2].country,
                    requestByAddress: users[2].address
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
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214
                        }
                    },
                    {
                        requestByAddress: users[1].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -33.2799527,
                            longitude: 9.1421702
                        }
                    },
                    {
                        requestByAddress: users[2].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -15.8697203,
                            longitude: -47.9207824
                        }
                    }
                ]);

                const claimed: SubgraphClaimed = [];
                for (const community of communities) {
                    claimed.push({
                        id: community.contractAddress!,
                        claimed: 0
                    });
                }

                returnCommunityEntities.returns([
                    {
                        id: communities[2].contractAddress,
                        beneficiaries: 3
                    },
                    {
                        id: communities[0].contractAddress,
                        beneficiaries: 4
                    },
                    {
                        id: communities[1].contractAddress,
                        beneficiaries: 4
                    }
                ]);

                const result = await communityListService.list({
                    orderBy: 'bigger:ASC;nearest:DESC',
                    lat: '-15.8697203',
                    lng: '-47.9207824'
                });

                expect(result.rows[0]).to.include({
                    id: communities[1].id,
                    name: communities[1].name,
                    country: communities[1].country,
                    requestByAddress: users[1].address
                });
                expect(result.rows[1]).to.include({
                    id: communities[0].id,
                    name: communities[0].name,
                    country: communities[0].country,
                    requestByAddress: users[0].address
                });
                expect(result.rows[2]).to.include({
                    id: communities[2].id,
                    name: communities[2].name,
                    country: communities[2].country,
                    requestByAddress: users[2].address
                });
            });

            it('out of funds', async () => {
                const communities = await CommunityFactory([
                    {
                        requestByAddress: users[0].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214
                        }
                    },
                    {
                        requestByAddress: users[1].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214
                        }
                    },
                    {
                        requestByAddress: users[2].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -15.8697203,
                            longitude: -47.9207824
                        }
                    }
                ]);

                const claimed: SubgraphClaimed = [];
                for (const community of communities) {
                    claimed.push({
                        id: community.contractAddress!,
                        claimed: 0
                    });
                }

                returnCommunityEntities.returns([
                    {
                        id: communities[1].contractAddress,
                        estimatedFunds: '0.01'
                    },
                    {
                        id: communities[2].contractAddress,
                        estimatedFunds: '1.50'
                    },
                    {
                        id: communities[0].contractAddress,
                        estimatedFunds: '100.00'
                    }
                ]);

                communities.forEach(el => {
                    returnCommunityStateSubgraph.withArgs(el.contractAddress).returns({
                        claims: 0,
                        claimed: '0',
                        beneficiaries: el.requestByAddress === users[1].address ? 5 : 4,
                        removedBeneficiaries: 0,
                        contributed: '0',
                        contributors: 0,
                        managers: 0
                    });
                });

                const result = await communityListService.list({
                    orderBy: 'out_of_funds'
                });

                expect(result.rows[0]).to.include({
                    id: communities[1].id,
                    name: communities[1].name,
                    country: communities[1].country,
                    requestByAddress: users[1].address
                });
                expect(result.rows[1]).to.include({
                    id: communities[2].id,
                    name: communities[2].name,
                    country: communities[2].country,
                    requestByAddress: users[2].address
                });
                expect(result.rows[2]).to.include({
                    id: communities[0].id,
                    name: communities[0].name,
                    country: communities[0].country,
                    requestByAddress: users[0].address
                });
            });
        });

        describe('query string filter', () => {
            afterEach(async () => {
                await truncate(sequelize, 'community');
                returnProposalsSubgraph.resetHistory();
                returnClaimedSubgraph.resetHistory();
            });

            it('filter with specific fields', async () => {
                const communities = await CommunityFactory([
                    {
                        requestByAddress: users[0].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214
                        }
                    }
                ]);

                returnCommunityEntities.returns([
                    {
                        id: communities[0].contractAddress,
                        beneficiaries: 0
                    }
                ]);

                const result = await communityListService.list({
                    fields: 'id;contractAddress;contract.maxClaim;contract.claimAmount'
                });

                expect(result.rows[0]).to.have.deep.keys(['id', 'contractAddress', 'contract']);
                expect(result.rows[0].contract).to.have.deep.keys(['claimAmount', 'maxClaim']);
                expect(result.rows[0]).to.include({
                    id: communities[0].id
                });
                expect(result.rows[0].contract).to.include({
                    maxClaim: communities[0]!.contract!.maxClaim,
                    claimAmount: communities[0]!.contract!.claimAmount
                });
            });

            it('filter with specific fields (proposal)', async () => {
                const proposal = await models.appProposal.create({
                    id: 5,
                    status: 0,
                    endBlock: 1150
                });
                const communities = await CommunityFactory([
                    {
                        requestByAddress: users[0].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        proposalId: proposal.id
                    }
                ]);

                returnCommunityEntities.returns([
                    {
                        id: communities[0].contractAddress,
                        beneficiaries: 0
                    }
                ]);

                const result = await communityListService.list({
                    fields: 'id;contractAddress;contract.maxClaim;proposal.*'
                });

                expect(result.rows[0]).to.have.deep.keys(['id', 'contractAddress', 'contract', 'proposal']);
                expect(result.rows[0].contract).to.have.deep.keys(['maxClaim']);
                expect(result.rows[0].proposal).to.have.deep.keys(['id', 'status', 'endBlock']);
                expect(result.rows[0]).to.include({
                    id: communities[0].id
                });
                expect(result.rows[0].contract).to.include({
                    maxClaim: communities[0]!.contract!.maxClaim
                });
                expect(result.rows[0].proposal).to.include({
                    id: proposal.id
                });
            });

            it('filter with grouped fields', async () => {
                const communities = await CommunityFactory([
                    {
                        requestByAddress: users[0].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214
                        }
                    }
                ]);

                returnCommunityEntities.returns([
                    {
                        id: communities[0].contractAddress,
                        beneficiaries: 0
                    }
                ]);

                const result = await communityListService.list({
                    fields: '*;contract.*'
                });

                expect(result.rows[0]).to.have.deep.keys([
                    'city',
                    'contract',
                    'contractAddress',
                    'country',
                    'coverMediaPath',
                    'createdAt',
                    'currency',
                    'deletedAt',
                    'description',
                    'gps',
                    'id',
                    'language',
                    'name',
                    'proposalId',
                    'ambassadorAddress',
                    'requestByAddress',
                    'review',
                    'started',
                    'status',
                    'updatedAt',
                    'visibility',
                    'placeId'
                ]);
                expect(result.rows[0].contract).to.have.deep.keys([
                    'claimAmount',
                    'maxClaim',
                    'blocked',
                    'decreaseStep',
                    'baseInterval',
                    'incrementInterval',
                    'communityId',
                    'createdAt',
                    'updatedAt',
                    'maxTranche',
                    'minTranche'
                ]);
                expect(result.rows[0]).to.include({
                    id: communities[0].id,
                    city: communities[0].city,
                    contractAddress: communities[0].contractAddress,
                    country: communities[0].country,
                    currency: communities[0].currency,
                    description: communities[0].description,
                    language: communities[0].language,
                    name: communities[0].name,
                    requestByAddress: communities[0].requestByAddress,
                    review: communities[0].review,
                    started: communities[0].started,
                    status: communities[0].status,
                    visibility: communities[0].visibility
                });
                expect(result.rows[0].contract).to.include({
                    maxClaim: communities[0]!.contract!.maxClaim,
                    claimAmount: communities[0]!.contract!.claimAmount,
                    baseInterval: communities[0]!.contract!.baseInterval,
                    incrementInterval: communities[0]!.contract!.incrementInterval,
                    communityId: communities[0]!.contract!.communityId
                });
            });

            it('filter with mixed fields', async () => {
                const communities = await CommunityFactory([
                    {
                        requestByAddress: users[0].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214
                        }
                    }
                ]);

                returnCommunityEntities.returns([
                    {
                        id: communities[0].contractAddress,
                        beneficiaries: 0
                    }
                ]);

                const result = await communityListService.list({
                    fields: 'id;contractAddress;contract.*;cover.*'
                });

                expect(result.rows[0]).to.have.deep.keys(['id', 'contractAddress', 'contract']);
                expect(result.rows[0].contract).to.have.deep.keys([
                    'claimAmount',
                    'maxClaim',
                    'baseInterval',
                    'incrementInterval',
                    'communityId',
                    'blocked',
                    'decreaseStep',
                    'createdAt',
                    'updatedAt',
                    'maxTranche',
                    'minTranche'
                ]);
                expect(result.rows[0]).to.include({
                    id: communities[0].id,
                    contractAddress: communities[0].contractAddress
                });
                expect(result.rows[0].contract).to.include({
                    maxClaim: communities[0]!.contract!.maxClaim,
                    claimAmount: communities[0]!.contract!.claimAmount,
                    baseInterval: communities[0]!.contract!.baseInterval,
                    incrementInterval: communities[0]!.contract!.incrementInterval,
                    communityId: communities[0]!.contract!.communityId
                });
            });

            it('filter pending community', async () => {
                const communities = await CommunityFactory([
                    {
                        requestByAddress: users[0].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214
                        }
                    },
                    {
                        requestByAddress: users[1].address,
                        started: new Date(),
                        status: 'pending',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214
                        }
                    },
                    {
                        requestByAddress: users[2].address,
                        started: new Date(),
                        status: 'pending',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214
                        }
                    }
                ]);

                const data = ethers.utils.defaultAbiCoder.encode(
                    ['address[]', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256'],
                    [
                        [communities[2].requestByAddress],
                        communities[2].contract!.claimAmount,
                        communities[2].contract!.maxClaim,
                        '10000000000000000',
                        communities[2].contract!.baseInterval,
                        communities[2].contract!.incrementInterval,
                        '10000000000000000',
                        '100000000000000000'
                    ]
                );

                returnProposalsSubgraph.returns([data]);
                returnClaimedSubgraph.returns([]);
                returnCommunityEntities.returns([
                    {
                        id: communities[1].contractAddress,
                        beneficiaries: 0
                    }
                ]);

                const result = await communityListService.list({
                    status: 'pending'
                });

                expect(result.rows[0]).to.include({
                    id: communities[1].id,
                    status: 'pending'
                });
            });

            it('should return pending communities with no open proposals (failed to found proposals in subgraph)', async () => {
                const communities = await CommunityFactory([
                    {
                        requestByAddress: users[0].address,
                        started: new Date(),
                        status: 'pending',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214
                        }
                    },
                    {
                        requestByAddress: users[1].address,
                        started: new Date(),
                        status: 'pending',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214
                        }
                    }
                ]);

                returnProposalsSubgraph.returns([]);
                returnClaimedSubgraph.returns([]);
                returnCommunityEntities.returns([
                    {
                        id: communities[0].contractAddress,
                        beneficiaries: 0
                    },
                    {
                        id: communities[1].contractAddress,
                        beneficiaries: 0
                    }
                ]);

                const pending = await communityListService.list({
                    status: 'pending'
                });

                expect(pending.count).to.be.equal(2);
            });
        });

        describe('ambassador list', () => {
            afterEach(async () => {
                await truncate(sequelize, 'community');
                returnProposalsSubgraph.resetHistory();
                returnClaimedSubgraph.resetHistory();
            });

            it('list pending communities by ambassadors address', async () => {
                const ambassadors = await UserFactory({
                    n: 1,
                    props: [
                        {
                            phone: '+5514999420299'
                        }
                    ]
                });
                const communities = await CommunityFactory([
                    {
                        requestByAddress: users[0].address,
                        started: new Date(),
                        status: 'pending',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214
                        },
                        country: 'BR',
                        ambassadorAddress: ambassadors[0].address
                    },
                    {
                        requestByAddress: users[2].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214
                        },
                        country: 'BR',
                        ambassadorAddress: ambassadors[0].address
                    }
                ]);

                returnProposalsSubgraph.returns([]);
                returnClaimedSubgraph.returns([]);
                returnCommunityEntities.returns([]);

                const result = await communityListService.list({
                    status: 'pending',
                    ambassadorAddress: ambassadors[0].address
                });

                expect(result.count).to.be.equal(1);
                expect(result.rows[0].id).to.be.equal(communities[0].id);
            });

            it('list valid communities by ambassadors address', async () => {
                const ambassadors = await UserFactory({
                    n: 2,
                    props: [
                        {
                            phone: '+12025550167'
                        },
                        {
                            phone: '+5514999420299'
                        }
                    ]
                });
                const communities = await CommunityFactory([
                    {
                        requestByAddress: users[0].address,
                        started: new Date(),
                        status: 'valid',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214
                        },
                        country: 'BR',
                        ambassadorAddress: ambassadors[0].address
                    },
                    {
                        requestByAddress: users[2].address,
                        started: new Date(),
                        status: 'pending',
                        visibility: 'public',
                        contract: {
                            baseInterval: 60 * 60 * 24,
                            claimAmount: 1,
                            communityId: 0,
                            incrementInterval: 5 * 60,
                            maxClaim: 450
                        },
                        hasAddress: true,
                        gps: {
                            latitude: -23.4378873,
                            longitude: -46.4841214
                        },
                        country: 'BR',
                        ambassadorAddress: ambassadors[0].address
                    }
                ]);

                returnClaimedSubgraph.returns([]);
                returnCommunityEntities.returns([]);
                returnAmbassadorByAddressSubgraph.returns({
                    communities: [communities[0].contractAddress]
                });

                const result = await communityListService.list({
                    ambassadorAddress: ambassadors[0].address,
                    status: 'valid'
                });

                expect(result.count).to.be.equal(1);
                expect(result.rows[0].id).to.be.equal(communities[0].id);
            });
        });
    });

    describe('find', () => {
        afterEach(async () => {
            await truncate(sequelize, 'community');
            returnClaimedSubgraph.resetHistory();
            returnCommunityEntities.resetHistory();
        });

        it('find by ID', async () => {
            const communities = await CommunityFactory([
                {
                    requestByAddress: users[0].address,
                    started: new Date(),
                    status: 'valid',
                    visibility: 'public',
                    contract: {
                        baseInterval: 60 * 60 * 24,
                        claimAmount: 1,
                        communityId: 0,
                        incrementInterval: 5 * 60,
                        maxClaim: 450
                    },
                    hasAddress: true
                },
                {
                    requestByAddress: users[1].address,
                    started: new Date(),
                    status: 'valid',
                    visibility: 'public',
                    contract: {
                        baseInterval: 60 * 60 * 24,
                        claimAmount: 1,
                        communityId: 0,
                        incrementInterval: 5 * 60,
                        maxClaim: 450
                    },
                    hasAddress: true
                }
            ]);

            const result = await communityDetailsService.findById(communities[0].id);

            expect(result).to.include({
                id: communities[0].id,
                name: communities[0].name,
                country: communities[0].country,
                requestByAddress: users[0].address
            });
        });

        it('find by contract address', async () => {
            const communities = await CommunityFactory([
                {
                    requestByAddress: users[0].address,
                    started: new Date(),
                    status: 'valid',
                    visibility: 'public',
                    contract: {
                        baseInterval: 60 * 60 * 24,
                        claimAmount: 1,
                        communityId: 0,
                        incrementInterval: 5 * 60,
                        maxClaim: 450
                    },
                    hasAddress: true
                },
                {
                    requestByAddress: users[1].address,
                    started: new Date(),
                    status: 'valid',
                    visibility: 'public',
                    contract: {
                        baseInterval: 60 * 60 * 24,
                        claimAmount: 1,
                        communityId: 0,
                        incrementInterval: 5 * 60,
                        maxClaim: 450
                    },
                    hasAddress: true
                }
            ]);

            const result = await communityDetailsService.findByContractAddress(communities[0].contractAddress!);

            expect(result).to.include({
                id: communities[0].id,
                name: communities[0].name,
                country: communities[0].country,
                requestByAddress: users[0].address
            });
        });
    });

    describe('edit', () => {
        afterEach(async () => {
            await truncate(sequelize, 'community');
            returnClaimedSubgraph.resetHistory();
            returnCommunityEntities.resetHistory();
        });

        it('edit review', async () => {
            const communities = await CommunityFactory([
                {
                    requestByAddress: users[0].address,
                    started: new Date(),
                    status: 'pending',
                    visibility: 'public',
                    contract: {
                        baseInterval: 60 * 60 * 24,
                        claimAmount: 1,
                        communityId: 0,
                        incrementInterval: 5 * 60,
                        maxClaim: 450
                    },
                    hasAddress: true
                }
            ]);

            returnUserRoleSubgraph.returns({
                ambassador: {
                    communities: [communities[0].contractAddress?.toLowerCase()]
                }
            });

            const result = await communityCreateService.review(communities[0].id, 'claimed', users[0].address);
            const community = await communityDetailsService.findById(communities[0].id);

            expect(communities[0].review).to.be.equal('pending');
            expect(result).to.be.true;
            expect(community).to.include({
                id: communities[0].id,
                review: 'claimed',
                ambassadorAddress: users[0].address
            });
        });

        it('edit submission', async () => {
            const communities = await CommunityFactory([
                {
                    requestByAddress: users[0].address,
                    started: new Date(),
                    status: 'pending',
                    visibility: 'public',
                    contract: {
                        baseInterval: 60 * 60 * 24,
                        claimAmount: 1,
                        communityId: 0,
                        incrementInterval: 5 * 60,
                        maxClaim: 450
                    },
                    hasAddress: true
                }
            ]);

            returnUserRoleSubgraph.returns({
                ambassador: {
                    communities: [communities[0].contractAddress?.toLowerCase()]
                }
            });

            const result = await communityCreateService.review(communities[0].id, 'claimed', users[0].address);
            const community = await communityCreateService.editSubmission(communities[0].id, {
                requestByAddress: users[0].address,
                name: 'new name',
                description: 'new description',
                language: 'pt',
                currency: 'BRL',
                city: 'São Paulo',
                country: 'BR',
                gps: {
                    latitude: 0,
                    longitude: 0
                },
                email: 'test@email.com'
            });

            expect(communities[0].review).to.be.equal('pending');
            expect(result).to.be.true;
            expect(community).to.include({
                id: communities[0].id,
                review: 'claimed',
                ambassadorAddress: users[0].address,
                name: 'new name',
                description: 'new description',
                language: 'pt',
                currency: 'BRL',
                city: 'São Paulo',
                country: 'BR',
                email: 'test@email.com'
            });
            expect(community.gps).to.include({
                latitude: 0,
                longitude: 0
            });
        });

        it('should not edit a submission if user is not the ambassador/manager', async () => {
            const communities = await CommunityFactory([
                {
                    requestByAddress: users[0].address,
                    started: new Date(),
                    status: 'pending',
                    visibility: 'public',
                    contract: {
                        baseInterval: 60 * 60 * 24,
                        claimAmount: 1,
                        communityId: 0,
                        incrementInterval: 5 * 60,
                        maxClaim: 450
                    },
                    hasAddress: true
                }
            ]);

            returnUserRoleSubgraph.returns({
                ambassador: {
                    communities: [communities[0].contractAddress?.toLowerCase()]
                }
            });

            await communityCreateService.review(communities[0].id, 'claimed', users[0].address);
            communityCreateService
                .editSubmission(communities[0].id, {
                    requestByAddress: users[1].address,
                    name: 'new name',
                    description: 'new description',
                    language: 'pt',
                    currency: 'BRL',
                    city: 'São Paulo',
                    country: 'BR',
                    gps: {
                        latitude: 0,
                        longitude: 0
                    },
                    email: 'test@email.com'
                })
                .catch(e => expect(e.name).to.be.equal('NOT_ALLOWED'))
                .then(() => {
                    throw new Error("'fails to welcome not existing account' expected to fail");
                });
        });
    });
});
