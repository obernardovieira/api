import { stub, assert, match, SinonStub } from 'sinon';

import GlobalDemographicsService from '../../../src/services/global/globalDemographics';

// import * as database from '../../../src/api/loaders/database';

const genderQueryResult = [
    {
        gender: 'f',
        total: 2740,
        country: 'BR',
    },
    {
        gender: 'm',
        total: 1363,
        country: 'BR',
    },
    {
        gender: 'u',
        total: 100,
        country: 'BR',
    },
    {
        gender: 'm',
        total: 1,
        country: 'CV',
    },
    {
        gender: 'f',
        total: 2,
        country: 'CV',
    },
    {
        gender: 'u',
        total: 10,
        country: 'CV',
    },
    {
        gender: 'o',
        total: 10,
        country: 'CV',
    },
    {
        gender: 'f',
        total: 11,
        country: 'GH',
    },
    {
        gender: 'm',
        total: 26,
        country: 'GH',
    },
    {
        gender: 'o',
        total: 10,
        country: 'GH',
    },
    {
        gender: 'f',
        total: 6,
        country: 'PH',
    },
    {
        gender: 'm',
        total: 5,
        country: 'PH',
    },
    {
        gender: 'u',
        total: 0,
        country: 'PH',
    },
];

const ageRangeQueryResult: {
    country: string;
    ageRange1: number;
    ageRange2: number;
    ageRange3: number;
    ageRange4: number;
    ageRange5: number;
    ageRange6: number;
}[] = [
    {
        country: 'NG',
        ageRange1: 0,
        ageRange2: 0,
        ageRange3: 0,
        ageRange4: 0,
        ageRange5: 0,
        ageRange6: 0,
    },
    {
        country: 'VE',
        ageRange1: 0,
        ageRange2: 0,
        ageRange3: 0,
        ageRange4: 0,
        ageRange5: 0,
        ageRange6: 0,
    },
    {
        country: 'HN',
        ageRange1: 0,
        ageRange2: 0,
        ageRange3: 0,
        ageRange4: 0,
        ageRange5: 0,
        ageRange6: 0,
    },
    {
        country: 'GH',
        ageRange1: 11,
        ageRange2: 9,
        ageRange3: 3,
        ageRange4: 4,
        ageRange5: 1,
        ageRange6: 0,
    },
    {
        country: 'BR',
        ageRange1: 937,
        ageRange2: 1197,
        ageRange3: 893,
        ageRange4: 502,
        ageRange5: 169,
        ageRange6: 40,
    },
    {
        country: 'PH',
        ageRange1: 3,
        ageRange2: 0,
        ageRange3: 0,
        ageRange4: 3,
        ageRange5: 1,
        ageRange6: 0,
    },
    {
        country: 'CV',
        ageRange1: 0,
        ageRange2: 0,
        ageRange3: 0,
        ageRange4: 0,
        ageRange5: 0,
        ageRange6: 0,
    },
];

const results = [
    {
        date: match.any,
        country: 'BR',
        ageRange1: 937,
        ageRange2: 1197,
        ageRange3: 893,
        ageRange4: 502,
        ageRange5: 169,
        ageRange6: 40,
        male: 1363,
        female: 2740,
        undisclosed: 100,
        totalGender: 4203,
    },
    {
        date: match.any,
        country: 'CV',
        ageRange1: 0,
        ageRange2: 0,
        ageRange3: 0,
        ageRange4: 0,
        ageRange5: 0,
        ageRange6: 0,
        male: 1,
        female: 2,
        undisclosed: 20,
        totalGender: 23,
    },
    {
        date: match.any,
        country: 'GH',
        ageRange1: 11,
        ageRange2: 9,
        ageRange3: 3,
        ageRange4: 4,
        ageRange5: 1,
        ageRange6: 0,
        male: 26,
        female: 11,
        undisclosed: 10,
        totalGender: 47,
    },
    {
        date: match.any,
        country: 'PH',
        ageRange1: 3,
        ageRange2: 0,
        ageRange3: 0,
        ageRange4: 3,
        ageRange5: 1,
        ageRange6: 0,
        male: 5,
        female: 6,
        undisclosed: 0,
        totalGender: 11,
    },
    {
        date: match.any,
        country: 'NG',
        ageRange1: 0,
        ageRange2: 0,
        ageRange3: 0,
        ageRange4: 0,
        ageRange5: 0,
        ageRange6: 0,
        // there are default values
    },
    {
        date: match.any,
        country: 'VE',
        ageRange1: 0,
        ageRange2: 0,
        ageRange3: 0,
        ageRange4: 0,
        ageRange5: 0,
        ageRange6: 0,
        // there are default values
    },
    {
        date: match.any,
        country: 'HN',
        ageRange1: 0,
        ageRange2: 0,
        ageRange3: 0,
        ageRange4: 0,
        ageRange5: 0,
        ageRange6: 0,
        // there are default values
    },
];

async function waitForStubCall(stub: SinonStub<any, any>, callNumber: number) {
    return new Promise((resolve) => {
        const validationInterval = setInterval(() => {
            if (stub.callCount >= callNumber) {
                resolve('');
                clearInterval(validationInterval);
            }
        }, 1000);
    });
}

describe('globalDemographics', () => {
    // TODO: fix whats in comment to work
    // stub(database, 'database').returns({
    //     sequelize: {
    //         query: ''
    //     },
    //     models: {
    //         globalDemographics: {
    //             bulkCreate: ''
    //         }
    //     },
    // });

    let dbGlobalDemographicsInsertStub: SinonStub;
    let dbSequelizeQueryStub: SinonStub;

    before(() => {
        dbSequelizeQueryStub = stub(
            GlobalDemographicsService.sequelize,
            'query'
        );

        dbSequelizeQueryStub
            .withArgs(match(/current_date_year/))
            .returns(Promise.resolve(ageRangeQueryResult as any));
        dbSequelizeQueryStub
            .withArgs(match(/gender/))
            .returns(Promise.resolve(genderQueryResult as any));

        dbGlobalDemographicsInsertStub = stub(
            GlobalDemographicsService.globalDemographics,
            'bulkCreate'
        );
    });

    it('#calculateDemographics()', async () => {
        await GlobalDemographicsService.calculateDemographics();
        //
        await waitForStubCall(dbGlobalDemographicsInsertStub, 1);
        assert.callCount(dbGlobalDemographicsInsertStub, 1);
        assert.calledWith(dbGlobalDemographicsInsertStub.getCall(0), results);
    });
});
