import { Router } from 'express';

import attestation from './attestation';
import claimLocation from './claimLocation';
import community from './community';
import generic from './generic';
import global from './global';
import learnAndEarn from './learnAndEarn';
import microcredit from './microcredit';
import protocol from './protocol';
import referrals from './referrals';
import story from './story';
import user from './user';

export default (): Router => {
    const app = Router();
    community(app);
    user(app);
    generic(app);
    story(app);
    claimLocation(app);
    learnAndEarn(app);
    global(app);
    attestation(app);
    microcredit(app);
    protocol(app);
    referrals(app);

    return app;
};
