import CronJobExecutedService from '@services/app/cronJobExecuted';
import GlobalDemographicsService from '@services/global/globalDemographics';
import CommunityService from '@services/ubi/community';
import { Logger } from '@utils/logger';
import { CronJob } from 'cron';
import { ethers } from 'ethers';

import config from '../config';
import { models } from '../database';
import { ChainSubscribers } from './jobs/chainSubscribers';
import {
    calcuateCommunitiesMetrics,
    internalNotifyLowCommunityFunds,
    internalNotifyNewCommunities,
    verifyCommunitySuspectActivity,
} from './jobs/cron/community';
import { calcuateGlobalMetrics } from './jobs/cron/global';
import { verifyStoriesLifecycle } from './jobs/cron/stories';
import { updateExchangeRates } from './jobs/cron/updateExchangeRates';
import {
    verifyUserSuspectActivity,
    verifyDeletedAccounts,
} from './jobs/cron/user';

export default async (): Promise<void> => {
    cron();
    const provider = new ethers.providers.JsonRpcProvider(config.jsonRpcUrl);
    let waitingForResponseAfterCrash = false;
    let successfullAnswersAfterCrash = 0;
    let successfullAnswersAfterTxRegWarn = 0;
    let intervalWhenCrash: NodeJS.Timeout | undefined = undefined;
    let intervalWhenTxRegWarn: NodeJS.Timeout | undefined = undefined;
    let waitingForResponseAfterTxRegWarn = false;

    const availableCommunities =
        await CommunityService.listCommunitiesStructOnly();
    const beneficiaries = (
        await models.beneficiary.findAll({
            attributes: ['address'],
            include: [
                {
                    model: models.community,
                    as: 'community',
                    attributes: [],
                    where: { visibility: 'public', status: 'valid' },
                },
            ],
            where: {
                active: true,
            },
            raw: true,
        })
    ).map((b) => b.address);
    const subscribers = new ChainSubscribers(
        provider,
        beneficiaries,
        new Map(
            availableCommunities.map((c) => [c.contractAddress!, c.publicId])
        ),
        new Map(availableCommunities.map((c) => [c.contractAddress!, c.id])),
        new Map(
            availableCommunities.map((c) => [
                c.contractAddress!,
                c.visibility === 'public',
            ])
        )
    );

    process.on('unhandledRejection', (error: any) => {
        // close all RPC connections and restart when available again
        const strError = JSON.stringify(error);
        Logger.error(strError);
        if (
            strError.indexOf('eth_') !== -1 && // any eth_ surely is related to the RPC
            (strError.indexOf('figment') !== -1 ||
                strError.indexOf('celo') !== -1) &&
            !waitingForResponseAfterCrash &&
            !waitingForResponseAfterTxRegWarn
        ) {
            waitingForResponseAfterCrash = true;
            subscribers.stop();
            // if a second crash happen before recovering from the first
            // it will get here again. Clear past time interval
            // and start again.
            if (intervalWhenCrash !== undefined) {
                clearInterval(intervalWhenCrash);
            }
            intervalWhenCrash = setInterval(() => {
                provider
                    .getBlockNumber()
                    .then(() => {
                        successfullAnswersAfterCrash += 1;
                        // require 5 successfull answers, to prevent two or more crashes in row
                        if (successfullAnswersAfterCrash < 5) {
                            Logger.error(
                                'Got ' +
                                    successfullAnswersAfterCrash +
                                    '/5 sucessfull responses form json rpc provider...'
                            );
                        } else {
                            Logger.error('Reconnecting json rpc provider...');
                            subscribers.recover();
                            clearInterval(intervalWhenCrash!);
                            intervalWhenCrash = undefined;
                            waitingForResponseAfterCrash = false;
                        }
                    })
                    .catch(() => {
                        Logger.error('Checking again if RPC is available...');
                        successfullAnswersAfterCrash = 0;
                    });
            }, 2000);
        }
    });
    process.on('warning', (warning) => {
        if (warning.name === 'TxRegistryFailureWarning') {
            waitingForResponseAfterTxRegWarn = true;
            Logger.error(
                'Restarting provider listeners after registry failure'
            );
            subscribers.stop();
            // if a second crash happen before recovering from the first
            // it will get here again. Clear past time interval
            // and start again.
            if (intervalWhenTxRegWarn !== undefined) {
                clearInterval(intervalWhenTxRegWarn);
            }
            intervalWhenTxRegWarn = setInterval(() => {
                Logger.error('Checking if RPC is available');
                provider
                    .getBlockNumber()
                    .then(() => {
                        successfullAnswersAfterTxRegWarn += 1;
                        if (successfullAnswersAfterTxRegWarn < 5) {
                            Logger.error(
                                'Got ' +
                                    successfullAnswersAfterTxRegWarn +
                                    '/5 sucessfull responses form json rpc provider...'
                            );
                        } else {
                            subscribers.recover();
                            clearInterval(intervalWhenTxRegWarn!);
                            waitingForResponseAfterTxRegWarn = false;
                        }
                    })
                    .catch(() => {
                        Logger.error('Checking again if RPC is available...');
                        successfullAnswersAfterTxRegWarn = 0;
                    });
            }, 2000);
        }
    });
};

/**
 * This method starts all cron jobs. Cron jobs jave specific times to happen.
 * They all follow the API timezone, which should be UTC, same as postgresql.
 */
function cron() {
    // multiple times a day

    // every four hour, update exchange rates
    if (
        config.currenciesApiKey !== undefined &&
        config.currenciesApiKey.length > 3 // allow to use any single char in staging env
    ) {
        updateExchangeRates();
        // eslint-disable-next-line no-new
        new CronJob(
            '25 */4 * * *',
            () => {
                updateExchangeRates()
                    .then(() => {
                        CronJobExecutedService.add('updateExchangeRates');
                        Logger.info(
                            'updateExchangeRates successfully executed!'
                        );
                    })
                    .catch((e) => {
                        Logger.error('updateExchangeRates FAILED! ' + e);
                    });
            },
            null,
            true
        );
    }

    // every eight hours, verify community funds
    // eslint-disable-next-line no-new
    // TODO: we internally decided to turn this off for a while.
    // A new better mechanism will replace this.
    // new CronJob(
    //     '45 */8 * * *',
    //     () => {
    //         verifyCommunityFunds()
    //             .then(() => {
    //                 CronJobExecutedService.add('verifyCommunityFunds');
    //                 Logger.info('verifyCommunityFunds successfully executed!');
    //             })
    //             .catch((e) => {
    //                 Logger.error('verifyCommunityFunds FAILED! ' + e);
    //             });
    //     },
    //     null,
    //     true
    // );

    if (config.internalNotifications) {
        try {
            // at 7:12pm
            // eslint-disable-next-line no-new
            new CronJob(
                '12 19 * * *',
                () => {
                    internalNotifyLowCommunityFunds()
                        .then(() => {
                            CronJobExecutedService.add(
                                'internalNotifyLowCommunityFunds'
                            );
                            Logger.info(
                                'internalNotifyLowCommunityFunds successfully executed!'
                            );
                        })
                        .catch((e) => {
                            Logger.error(
                                'internalNotifyLowCommunityFunds FAILED! ' + e
                            );
                        });
                },
                null,
                true
            );
        } catch (_) {}

        try {
            // at 7:30am on Wednesday
            // eslint-disable-next-line no-new
            new CronJob(
                '30 7 * * 3',
                () => {
                    internalNotifyNewCommunities()
                        .then(() => {
                            CronJobExecutedService.add(
                                'internalNotifyNewCommunities'
                            );
                            Logger.info(
                                'internalNotifyNewCommunities successfully executed!'
                            );
                        })
                        .catch((e) => {
                            Logger.error(
                                'internalNotifyNewCommunities FAILED! ' + e
                            );
                        });
                },
                null,
                true
            );
        } catch (_) {}
    }

    // once a day

    // everyday at midnight
    // eslint-disable-next-line no-new
    new CronJob(
        '0 0 * * *',
        () => {
            Logger.info('Calculating community metrics...');
            calcuateCommunitiesMetrics()
                .then(() => {
                    CronJobExecutedService.add('calcuateCommunitiesMetrics');
                    Logger.info('Calculating global metrics...');
                    calcuateGlobalMetrics()
                        .then(() => {
                            CronJobExecutedService.add('calcuateGlobalMetrics');
                            Logger.info(
                                'calcuateGlobalMetrics successfully executed!'
                            );
                        })
                        .catch((e) => {
                            Logger.error('calcuateGlobalMetrics FAILED! ' + e);
                        });
                    Logger.info(
                        'calcuateCommunitiesMetrics successfully executed!'
                    );
                })
                .catch((e) => {
                    Logger.error('calcuateCommunitiesMetrics FAILED! ' + e);
                });
        },
        null,
        true
    );

    // eslint-disable-next-line no-new
    new CronJob(
        '0 0 * * *',
        () => {
            GlobalDemographicsService.calculateDemographics()
                .then(() => {
                    CronJobExecutedService.add('calculateDemographics');
                    Logger.info('calculateDemographics successfully executed!');
                })
                .catch((e) => {
                    Logger.error('calculateDemographics FAILED! ' + e);
                });
        },
        null,
        true
    );

    try {
        // eslint-disable-next-line no-new
        new CronJob(
            '0 0 * * *',
            () => {
                GlobalDemographicsService.calculateCommunitiesDemographics()
                    .then(() => {
                        CronJobExecutedService.add(
                            'calculateCommunitiesDemographics'
                        );
                        Logger.info(
                            'calculateCommunitiesDemographics successfully executed!'
                        );
                    })
                    .catch((e) => {
                        Logger.error(
                            'calculateCommunitiesDemographics FAILED! ' + e
                        );
                    });
            },
            null,
            true
        );
    } catch (e) {
        /** */
    }

    // everyday at 1am
    // eslint-disable-next-line no-new
    new CronJob(
        '0 1 * * *',
        () => {
            Logger.info('Verify stories...');
            verifyStoriesLifecycle()
                .then(() => {
                    CronJobExecutedService.add('verifyStoriesLifecycle');
                    Logger.info(
                        'verifyStoriesLifecycle successfully executed!'
                    );
                })
                .catch((e) => {
                    Logger.error('verifyStoriesLifecycle FAILED! ' + e);
                });
        },
        null,
        true
    );

    // at 5:12 am.
    // eslint-disable-next-line no-new
    new CronJob(
        '12 5 * * *',
        () => {
            Logger.info('Verify community suspicious activity...');
            verifyCommunitySuspectActivity()
                .then(() => {
                    CronJobExecutedService.add(
                        'verifyCommunitySuspectActivity'
                    );
                    Logger.info(
                        'verifyCommunitySuspectActivity successfully executed!'
                    );
                })
                .catch((e) => {
                    Logger.error('verifyCommunitySuspectActivity FAILED! ' + e);
                });
        },
        null,
        true
    );

    // at 2:12 am and 2:12 pm.
    // eslint-disable-next-line no-new
    new CronJob(
        '12 2,14 * * *',
        () => {
            Logger.info('Verify user suspicious activity...');
            verifyUserSuspectActivity()
                .then(() => {
                    CronJobExecutedService.add('verifyUserSuspectActivity');
                    Logger.info(
                        'verifyUserSuspectActivity successfully executed!'
                    );
                })
                .catch((e) => {
                    Logger.error('verifyUserSuspectActivity FAILED! ' + e);
                });
        },
        null,
        true
    );

    try {
        // everyday at 1am
        // eslint-disable-next-line no-new
        new CronJob(
            '0 1 * * *',
            () => {
                Logger.info('Verify deleted accounts...');
                verifyDeletedAccounts()
                    .then(() => {
                        CronJobExecutedService.add('verifyDeletedAccounts');
                        Logger.info('verifyDeletedAccounts successfully executed!');
                    })
                    .catch((e) => {
                        Logger.error('verifyDeletedAccounts FAILED! ' + e);
                    });
            },
            null,
            true
        );
    } catch (e) {
        /** */
    }
}
