import { expect } from 'chai';
import { ethers } from 'ethers';
import { Sequelize } from 'sequelize';
import { stub, assert, SinonStub, spy, SinonSpy } from 'sinon';

import { models } from '../../../../src/database';
import { CommunityAttributes } from '../../../../src/database/models/ubi/community';
import { ManagerAttributes } from '../../../../src/database/models/ubi/manager';
import { User } from '../../../../src/interfaces/app/user';
import UserService from '../../../../src/services/app/user';
import GlobalDemographicsService from '../../../../src/services/global/globalDemographics';
import StoryService from '../../../../src/services/story';
import BeneficiaryService from '../../../../src/services/ubi/beneficiary';
import ClaimsService from '../../../../src/services/ubi/claim';
import CommunityService from '../../../../src/services/ubi/community';
import InflowService from '../../../../src/services/ubi/inflow';
import { verifyDeletedAccounts } from '../../../../src/worker/jobs/cron/user';
import CommunityFactory from '../../../factories/community';
import ManagerFactory from '../../../factories/manager';
import UserFactory from '../../../factories/user';
import { waitForStubCall } from '../../../utils';
import truncate, { sequelizeSetup } from '../../../utils/sequelizeSetup';
import { randomTx } from '../../../utils/utils';

describe('[jobs - cron] verifyDeletedAccounts', () => {
    let sequelize: Sequelize;
    let users: User[];
    let managers: ManagerAttributes[];
    let communities: CommunityAttributes[];
    let dbGlobalDemographicsStub: SinonStub;

    before(async () => {
        sequelize = sequelizeSetup();
        await sequelize.sync();

        dbGlobalDemographicsStub = stub(
            GlobalDemographicsService.ubiCommunityDemographics,
            'bulkCreate'
        );

        users = await UserFactory({
            n: 4,
            props: [
                {
                    gender: 'm',
                    year: 1990,
                },
                {
                    gender: 'f',
                    year: 1980,
                },
                {
                    gender: 'u',
                    year: 1970,
                },
                {
                    gender: 'u',
                    year: 1965,
                },
            ],
        });
        communities = await CommunityFactory([
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
        managers = await ManagerFactory([users[0]], communities[0].publicId);

        const randomWallet = ethers.Wallet.createRandom();
        const tx = randomTx();
        const tx2 = randomTx();
        const tx3 = randomTx();

        await BeneficiaryService.add(
            users[1].address,
            users[0].address,
            communities[0].publicId,
            tx,
            new Date()
        );

        await BeneficiaryService.add(
            users[2].address,
            users[0].address,
            communities[0].publicId,
            tx2,
            new Date()
        );

        await BeneficiaryService.add(
            users[3].address,
            users[0].address,
            communities[0].publicId,
            tx3,
            new Date()
        );

        await BeneficiaryService.addTransaction({
            beneficiary: users[1].address,
            withAddress: await randomWallet.getAddress(),
            amount: '25',
            isFromBeneficiary: true,
            tx,
            date: new Date(), // date only
        });

        await ClaimsService.add({
            address: users[1].address,
            communityId: communities[0].id,
            amount: '15',
            tx,
            txAt: new Date('2021-01-02'),
        });

        await InflowService.add(
            users[1].address,
            communities[0].publicId,
            '30',
            tx,
            new Date()
        );

        const storyService = new StoryService();
        const story = await storyService.add(users[0].address, {
            byAddress: users[0].address,
            communityId: communities[0].id,
        });
        await storyService.love(users[0].address, story.id);
    });

    after(async () => {
        await truncate(sequelize, 'UserModel');
        await truncate(sequelize, 'Manager');
        await truncate(sequelize, 'Beneficiary');
        await truncate(sequelize, 'StoryCommunityModel')
        await truncate(sequelize);
    });

    it('should not delete a user before 15 days have passed', async () => {
        const date = new Date();
        date.setDate(date.getDate() - 14);

        await models.user.update(
            {
                deletedAt: date,
            },
            {
                where: {
                    address: users[2].address,
                },
            }
        );

        await verifyDeletedAccounts();

        const user = await models.user.findOne({
            where: {
                address: users[2].address,
            },
        });

        expect(user).to.exist;
        expect(user).to.include({
            address: users[2].address,
            active: true,
        });
    });

    it('delete user/beneficiary', async () => {
        const date = new Date();
        date.setDate(date.getDate() - 16);

        await models.user.update(
            {
                deletedAt: date,
            },
            {
                where: {
                    address: users[1].address,
                },
            }
        );

        await verifyDeletedAccounts();

        const user = await models.user.findOne({
            where: {
                address: users[1].address,
            },
        });

        const phone = users[1].trust ? users[1].trust[0].phone : null;
        const findPhone = await models.appUserTrust.findOne({
            where: {
                phone,
            },
        });

        const beneficiary = await models.beneficiary.findOne({
            where: {
                address: users[1].address,
            },
        });

        const registry = (await models.ubiBeneficiaryRegistry.findOne({
            where: {
                address: users[1].address,
            },
        }))!.toJSON();

        const transactions = (await models.beneficiaryTransaction.findOne({
            where: {
                beneficiary: users[1].address,
            },
        }))!.toJSON();

        const claims = (await models.ubiClaim.findOne({
            where: {
                address: users[1].address,
            },
        }))!.toJSON();

        const inflow = (await models.inflow.findOne({
            where: {
                from: users[1].address,
            },
        }))!.toJSON();

        expect(user).to.be.null;
        expect(findPhone).to.be.null;
        expect(beneficiary).to.include({
            active: true,
        });
        expect(registry).to.include({
            activity: 0,
        });
        expect(transactions).to.include({
            amount: '25',
            isFromBeneficiary: true,
        });
        expect(claims).to.include({
            amount: '15',
        });
        expect(inflow).to.include({
            amount: '30',
        });
    });

    it('delete user/manager', async () => {
        const date = new Date();
        date.setDate(date.getDate() - 16);

        await models.user.update(
            {
                deletedAt: date,
            },
            {
                where: {
                    address: users[0].address,
                },
            }
        );

        await verifyDeletedAccounts();

        const user = await models.user.findOne({
            where: {
                address: users[0].address,
            },
        });

        const manager = await models.manager.findOne({
            where: {
                address: users[0].address,
            },
        });

        const phone = users[0].trust ? users[0].trust[0].phone : null;
        const findPhone = await models.appUserTrust.findOne({
            where: {
                phone,
            },
        });
        const findStoryContent = await models.storyContent.findOne({
            where: {
                byAddress: users[0].address,
            },
        });
        const findStoryUserEngagement =
            await models.storyUserEngagement.findOne({
                where: {
                    address: users[0].address,
                },
            });

        expect(user).to.be.null;
        expect(findPhone).to.be.null;
        expect(manager).to.include({
            active: true,
        });
        expect(findStoryContent).to.be.null;
        expect(findStoryUserEngagement).to.be.null;
    });

    it('search beneficiary by address after delete user', async () => {
        const beneficiary = await BeneficiaryService.search(
            users[0].address,
            users[1].address
        );
        expect(beneficiary[0]).to.include({
            address: users[1].address,
            username: null,
            isDeleted: true,
        });
    });
    it('search beneficiary by username after delete user', async () => {
        const beneficiary = await BeneficiaryService.search(
            users[0].address,
            users[1].username!
        );
        expect(beneficiary.length).to.be.equal(0);
    });

    it('list beneficiaries after delete user', async () => {
        const beneficiary = await BeneficiaryService.list(
            users[0].address,
            true,
            0,
            10
        );

        beneficiary.forEach((el) => {
            if (el.address === users[1].address) {
                expect(el).to.include({
                    address: users[1].address,
                    username: null,
                    isDeleted: true, // deleted
                });
            } else if (el.address === users[2].address) {
                expect(el).to.include({
                    address: users[2].address,
                    username: users[2].username,
                    isDeleted: true, // target to be deleted
                });
            } else if (el.address === users[3].address) {
                expect(el).to.include({
                    address: users[3].address,
                    username: users[3].username,
                    isDeleted: false,
                });
            }
        });
    });

    it('get managers after delete user', async () => {
        const manager = await CommunityService.getManagers(communities[0].id);
        expect(manager[0]).to.include({
            address: users[0].address,
            user: null,
            isDeleted: true,
        });
    });

    it('calculateCommunitiesDemographics after delete user (should ignore deleted users)', async () => {
        await GlobalDemographicsService.calculateCommunitiesDemographics();
        await waitForStubCall(dbGlobalDemographicsStub, 1);
        const yesterdayDateOnly = new Date();
        yesterdayDateOnly.setDate(yesterdayDateOnly.getDate() - 1);
        const yesterdayDate = yesterdayDateOnly.toISOString().split('T')[0];
        assert.calledWith(dbGlobalDemographicsStub.getCall(0), [
            {
                communityId: communities[0].id,
                date: yesterdayDate,
                ageRange1: '0',
                ageRange2: '0',
                ageRange3: '0',
                ageRange4: '1',
                ageRange5: '1',
                ageRange6: '0',
                male: '0',
                female: '0',
                undisclosed: '2',
                totalGender: '2',
            },
        ]);
    });
});
