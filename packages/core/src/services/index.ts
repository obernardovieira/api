import * as MicroCredit from './microcredit';
import * as app from './app';
import * as global from './global';
import * as storage from './storage';
import * as ubi from './ubi';
import { answer } from './learnAndEarn/answer';
import { createLevel } from './learnAndEarn/create';
import { listLessons, listLevels, listLevelsByAdmin } from './learnAndEarn/list';
import { registerClaimRewards } from './learnAndEarn/claimRewards';
import { startLesson } from './learnAndEarn/start';
import { total } from './learnAndEarn/userData';
import { webhook } from './learnAndEarn/syncRemote';
import Protocol from './protocol';
import StoryServiceV2 from './story/index';

const learnAndEarn = {
    answer,
    registerClaimRewards,
    listLessons,
    listLevels,
    listLevelsByAdmin,
    startLesson,
    webhook,
    total,
    createLevel
};
export { app, global, storage, ubi, StoryServiceV2, learnAndEarn, MicroCredit, Protocol };
