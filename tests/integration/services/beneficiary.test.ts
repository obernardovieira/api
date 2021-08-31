import { use, expect } from 'chai';
import chaiSubset from 'chai-subset';
import { ethers } from 'ethers';
import { Sequelize } from 'sequelize';
import { assert, spy, replace, restore, SinonSpy } from 'sinon';

import { models, sequelize as database } from '../../../src/database';
import { BeneficiaryAttributes } from '../../../src/database/models/ubi/beneficiary';
import { CommunityAttributes } from '../../../src/database/models/ubi/community';
import { ManagerAttributes } from '../../../src/database/models/ubi/manager';
import { User } from '../../../src/interfaces/app/user';
import { UbiBeneficiaryRegistryType } from '../../../src/interfaces/ubi/ubiBeneficiaryRegistry';
import BeneficiaryService from '../../../src/services/ubi/beneficiary';
import ClaimsService from '../../../src/services/ubi/claim';
import { IListBeneficiary } from '../../../src/types/endpoints';
import BeneficiaryFactory from '../../factories/beneficiary';
import ClaimFactory from '../../factories/claim';
import CommunityFactory from '../../factories/community';
import ManagerFactory from '../../factories/manager';
import UserFactory from '../../factories/user';
import truncate, { sequelizeSetup } from '../../utils/sequelizeSetup';
import { randomTx } from '../../utils/utils';

use(chaiSubset);

// in this test there are users being assined with suspicious activity and others being removed
describe('beneficiary service', () => {
    let sequelize: Sequelize;
    let users: User[];
    let communities: CommunityAttributes[];
    let managers: ManagerAttributes[];
    let beneficiaries: BeneficiaryAttributes[];

    let spyBeneficiaryRegistryAdd: SinonSpy;
    let spyBeneficiaryAdd: SinonSpy;
    let spyBeneficiaryUpdate: SinonSpy;

    before(async () => {
        sequelize = sequelizeSetup();
        await sequelize.sync();

        users = await UserFactory({ n: 17 });
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
        beneficiaries = await BeneficiaryFactory(
            users.slice(0, 8),
            communities[0].publicId
        );

        spyBeneficiaryRegistryAdd = spy(
            models.ubiBeneficiaryRegistry,
            'create'
        );
        spyBeneficiaryAdd = spy(models.beneficiary, 'create');
        spyBeneficiaryUpdate = spy(models.beneficiary, 'update');
        replace(database, 'query', sequelize.query);
    });

    after(async () => {
        // this two has to come first!
        await truncate(sequelize, 'Manager');
        await truncate(sequelize, 'UbiBeneficiaryRegistryModel');
        await truncate(sequelize, 'Beneficiary');
        await truncate(sequelize);
        //
        spyBeneficiaryAdd.restore();
        spyBeneficiaryRegistryAdd.restore();
        restore();
    });

    it('order by suspicious activity', async () => {
        // set some as suspect
        await sequelize.models.UserModel.update(
            { suspect: true },
            { where: { address: users[2].address } }
        );
        await sequelize.models.UserModel.update(
            { suspect: true },
            { where: { address: users[4].address } }
        );
        for (let index = 0; index < 8; index++) {
            await ClaimFactory(beneficiaries[index], communities[0]);
        }
        // test results
        let result: IListBeneficiary[];
        result = await BeneficiaryService.list(managers[0].address, true, 0, 5);
        (expect(result.slice(0, 2)).to as any).containSubset([
            {
                address: users[4].address,
                suspect: true,
            },
            {
                address: users[2].address,
                suspect: true,
            },
        ]);
        (expect(result.slice(2, 5)).to as any).containSubset([
            {
                address: users[7].address,
                suspect: false,
            },
            {
                address: users[6].address,
                suspect: false,
            },
            {
                address: users[5].address,
                suspect: false,
            },
        ]);
        // change suspects
        await sequelize.models.UserModel.update(
            { suspect: false },
            { where: { address: users[4].address } }
        );
        await sequelize.models.UserModel.update(
            { suspect: true },
            { where: { address: users[5].address } }
        );
        beneficiaries = beneficiaries.concat(
            await BeneficiaryFactory(
                users.slice(10, 15),
                communities[0].publicId
            )
        );
        // test results
        result = await BeneficiaryService.list(managers[0].address, true, 0, 5);
        (expect(result.slice(0, 2)).to as any).containSubset([
            {
                address: users[5].address,
                suspect: true,
            },
            {
                address: users[2].address,
                suspect: true,
            },
        ]);
        (expect(result.slice(2, 5)).to as any).containSubset([
            {
                address: users[14].address,
                suspect: false,
            },
            {
                address: users[13].address,
                suspect: false,
            },
            {
                address: users[12].address,
                suspect: false,
            },
        ]);
    });

    it('add to public community', async () => {
        spyBeneficiaryAdd.resetHistory();
        spyBeneficiaryRegistryAdd.resetHistory();
        // add
        const tx = randomTx();
        const txAt = new Date();
        await BeneficiaryService.add(
            users[15].address,
            users[0].address,
            communities[0].publicId,
            tx,
            txAt
        );

        //
        assert.callCount(spyBeneficiaryAdd, 1);
        assert.calledWith(spyBeneficiaryAdd.getCall(0), {
            address: users[15].address,
            communityId: communities[0].publicId,
            tx,
            txAt,
        });
        //
        assert.callCount(spyBeneficiaryRegistryAdd, 1);
        assert.calledWith(spyBeneficiaryRegistryAdd.getCall(0), {
            address: users[15].address,
            from: users[0].address,
            communityId: communities[0].id,
            activity: UbiBeneficiaryRegistryType.add,
            tx,
            txAt,
        });
    });

    it('remove from public community', async () => {
        spyBeneficiaryUpdate.resetHistory();
        spyBeneficiaryRegistryAdd.resetHistory();
        // add
        await BeneficiaryService.add(
            users[15].address,
            users[0].address,
            communities[0].publicId,
            randomTx(),
            new Date()
        );
        const tx = randomTx();
        const txAt = new Date();
        await BeneficiaryService.remove(
            users[15].address,
            users[0].address,
            communities[0].publicId,
            tx,
            txAt
        );

        //
        assert.callCount(spyBeneficiaryUpdate, 1);
        assert.calledWith(
            spyBeneficiaryUpdate.getCall(0),
            {
                active: false,
            },
            {
                where: {
                    address: users[15].address,
                    communityId: communities[0].publicId,
                },
            }
        );
        //
        assert.callCount(spyBeneficiaryRegistryAdd, 1);
        assert.calledWith(spyBeneficiaryRegistryAdd.getCall(0), {
            address: users[15].address,
            from: users[0].address,
            communityId: communities[0].id,
            activity: UbiBeneficiaryRegistryType.remove,
            tx,
            txAt,
        });
    });

    describe('search', () => {
        it('by name (full)', async () => {
            const user = users[3];
            const result: IListBeneficiary[] = await BeneficiaryService.search(
                users[0].address,
                user.username!
            );
            expect(result.length).to.be.equal(1);
            expect(result[0]).to.contain({
                address: user.address,
                username: user.username!,
            });
        });

        it('by name (partially)', async () => {
            const user = users[4];
            const result = await BeneficiaryService.search(
                users[0].address,
                user.username!.slice(0, user.username!.length / 2)
            );
            expect(result.length).to.be.equal(1);
            expect(result[0]).to.contain({
                address: user.address,
                username: user.username!,
            });
        });

        it('by name (not case sensitive)', async () => {
            const user = users[5];
            const result = await BeneficiaryService.search(
                users[0].address,
                user.username!.toUpperCase()
            );
            expect(result.length).to.be.equal(1);
            expect(result[0]).to.contain({
                address: user.address,
                username: user.username!,
            });
        });

        it('by address (checksumed)', async () => {
            const user = users[6];
            const result = await BeneficiaryService.search(
                users[0].address,
                user.address
            );
            expect(result.length).to.be.equal(1);
            expect(result[0]).to.contain({
                address: user.address,
                username: user.username!,
            });
        });

        it('by address (not checksumed)', async () => {
            const user = users[7];
            const result = await BeneficiaryService.search(
                users[0].address,
                user.address.toLowerCase()
            );
            expect(result.length).to.be.equal(1);
            expect(result[0]).to.contain({
                address: user.address,
                username: user.username!,
            });
        });

        it('by non (beneficiary) existing address', async () => {
            const user = users[8];
            const result = await BeneficiaryService.search(
                users[0].address,
                user.address.toLowerCase()
            );
            expect(result.length).to.be.equal(0);
        });

        it('by non (beneficiary) existing name', async () => {
            const user = users[9];
            const result = await BeneficiaryService.search(
                users[0].address,
                user.username!.toUpperCase()
            );
            expect(result.length).to.be.equal(0);
        });
    });

    describe('beneficiary activity', () => {
        before(async () => {
            const randomWallet = ethers.Wallet.createRandom();

            const tx = randomTx();
            const tx2 = randomTx();

            await BeneficiaryService.add(
                users[16].address,
                users[0].address,
                communities[0].publicId,
                tx,
                new Date('2021-01-01')
            );

            await BeneficiaryService.addTransaction({
                beneficiary: users[16].address,
                withAddress: await randomWallet.getAddress(),
                amount: '25',
                isFromBeneficiary: true,
                tx,
                date: new Date(), // date only
            });

            await BeneficiaryService.addTransaction({
                beneficiary: users[16].address,
                withAddress: await randomWallet.getAddress(),
                amount: '50',
                isFromBeneficiary: false,
                tx: tx2,
                date: new Date(), // date only
            });

            await ClaimsService.add({
                address: users[16].address,
                communityId: communities[0].id,
                amount: '15',
                tx,
                txAt: new Date('2021-01-02'),
            });
        });

        it('get all activities', async () => {
            const activities = await BeneficiaryService.getBeneficiaryActivity(
                users[0].address,
                users[16].address,
                'ALL',
                0,
                10
            );

            expect(activities[0]).to.include({
                type: 'transaction',
                amount: '50',
                isFromBeneficiary: false,
            });
            expect(activities[1]).to.include({
                type: 'transaction',
                amount: '25',
                isFromBeneficiary: true,
            });
            expect(activities[2]).to.include({
                type: 'claim',
                amount: '15',
            });
            expect(activities[3]).to.include({
                type: 'registry',
                activity: 0,
                withAddress: users[0].address,
                username: users[0].username,
            });
        });

        it('get claim activity', async () => {
            const activities = await BeneficiaryService.getBeneficiaryActivity(
                users[0].address,
                users[16].address,
                'claim',
                0,
                10
            );

            expect(activities[0]).to.include({
                type: 'claim',
                amount: '15',
            });
        });

        it('get registry activity', async () => {
            const activities = await BeneficiaryService.getBeneficiaryActivity(
                users[0].address,
                users[16].address,
                'registry',
                0,
                10
            );

            expect(activities[0]).to.include({
                type: 'registry',
                activity: 0,
                withAddress: users[0].address,
                username: users[0].username,
            });
        });

        it('get transaction activity', async () => {
            const activities = await BeneficiaryService.getBeneficiaryActivity(
                users[0].address,
                users[16].address,
                'transaction',
                0,
                10
            );

            expect(activities[0]).to.include({
                type: 'transaction',
                amount: '50',
                isFromBeneficiary: false,
            });
            expect(activities[1]).to.include({
                type: 'transaction',
                amount: '25',
                isFromBeneficiary: true,
            });
        });
    });
});
