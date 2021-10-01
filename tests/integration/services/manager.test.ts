import { use, expect } from 'chai';
import chaiSubset from 'chai-subset';
import { Sequelize } from 'sequelize';
import { CommunityAttributes } from '../../../src/database/models/ubi/community';
import { AppUser } from '../../../src/interfaces/app/appUser';
import UserService from '../../../src/services/app/user';
import ManagerService from '../../../src/services/ubi/managers';
import CommunityFactory from '../../factories/community';
import UserFactory from '../../factories/user';
import truncate, { sequelizeSetup } from '../../utils/sequelizeSetup';
import ManagerFactory from '../../factories/manager';

use(chaiSubset);

// in this test there are users being assined with suspicious activity and others being removed
describe('manager service', () => {
    let sequelize: Sequelize;
    let users: AppUser[];
    let communities: CommunityAttributes[];

    before(async () => {
        sequelize = sequelizeSetup();
        await sequelize.sync();

        users = await UserFactory({ n: 1 });
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

        // const t = await sequelize.transaction();
        // await ManagerService.add(users[0].address, communities[0].publicId, t);
        await ManagerFactory([users[0]], communities[0].publicId);

    });

    after(async () => {
        await truncate(sequelize, 'Manager');
        await truncate(sequelize);
    });

    describe('manager rules', () => {
        it('readRules should be false after a manager has been added', async () => {
            const user = await UserService.welcome(users[0].address);

            expect(user.manager).to.be.not.null;
            expect(user.manager).to.include({
                readRules: false,
                communityId: communities[0].publicId,
            });
        });

        it('should read the manager rules successfully', async () => {
            const readRules = await ManagerService.readRules(
                users[0].address
            );
            const user = await UserService.welcome(users[0].address);

            expect(readRules).to.be.true;
            expect(user.manager).to.be.not.null;
            expect(user.manager).to.include({
                readRules: true,
                communityId: communities[0].publicId,
            });
        });
    });
});
