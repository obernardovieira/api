import {
    services,
    utils,
    config,
    contracts,
    database,
} from '../../';
import { ethers } from 'ethers';
import { models } from '../database';
import { NotificationType } from '../interfaces/app/appNotification';
import { sendNotification } from '../utils/pushNotification';

class ChainSubscribers {
    provider: ethers.providers.WebSocketProvider;
    jsonRpcProvider: ethers.providers.JsonRpcProvider;
    ifaceCommunityAdmin: ethers.utils.Interface;
    ifaceCommunity: ethers.utils.Interface;
    ifaceMicrocredit: ethers.utils.Interface;
    filterTopics: string[][];
    communities: Map<string, number>;

    constructor(
        webSocketProvider: ethers.providers.WebSocketProvider,
        jsonRpcProvider: ethers.providers.JsonRpcProvider,
        communities: Map<string, number>,
    ) {
        this.provider = webSocketProvider;
        this.jsonRpcProvider = jsonRpcProvider;
        this.ifaceCommunityAdmin = new ethers.utils.Interface(
            contracts.CommunityAdminABI
        );
        this.ifaceCommunity = new ethers.utils.Interface(
            contracts.CommunityABI
        );
        this.ifaceMicrocredit = new ethers.utils.Interface(
            contracts.MicrocreditABI
        );
        this.communities = communities;    
        this.filterTopics = [
            [
                ethers.utils.id(
                    'CommunityAdded(address,address[],uint256,uint256,uint256,uint256,uint256,uint256,uint256)'
                ),
                ethers.utils.id('CommunityRemoved(address)'),
                ethers.utils.id('BeneficiaryAdded(address,address)'),
                ethers.utils.id('BeneficiaryRemoved(address,address)'),
                ethers.utils.id('LoanAdded(address,uint256,uint256,uint256,uint256,uint256)'),
            ],
        ];
        this.recover();
    }

    stop() {
        this.provider.removeAllListeners();
        services.app.ImMetadataService.setRecoverBlockUsingLastBlock();
    }

    recover() {
        this._setupListener(this.provider);
        // we start the listener alongside with the recover system
        // so we know we don't lose events.
        this._runRecoveryTxs(this.jsonRpcProvider).then(() =>
            services.app.ImMetadataService.removeRecoverBlock()
        )
    }

    async _runRecoveryTxs(
        provider: ethers.providers.JsonRpcProvider
    ) {
        utils.Logger.info('Recovering past events...');
        let startFromBlock: number;
        let lastBlockCached = await database.redisClient.get('lastBlock');
        if (!lastBlockCached) {
            startFromBlock = await services.app.ImMetadataService.getRecoverBlock();
        } else {
            startFromBlock = parseInt(lastBlockCached)
        }

        const rawLogs = await provider.getLogs({
            fromBlock: startFromBlock,
            toBlock: 'latest',
            topics: this.filterTopics,
        });

        const logs = rawLogs.sort((a, b) => {
            if (a.blockNumber > b.blockNumber) {
                return 1;
            }
            if (a.blockNumber < b.blockNumber) {
                return -1;
            }
            // a must be equal to b
            return 0;
        });

        // iterate
        for (let x = 0; x < logs.length; x += 1) {
            // verify if cusd or community and do things
            await this._filterAndProcessEvent(logs[x]);
        }
        utils.Logger.info('Past events recovered successfully!');
    }

    _setupListener(provider: ethers.providers.WebSocketProvider) {
        utils.Logger.info('Starting subscribers...');
        const filter = {
            topics: this.filterTopics,
        };

        database.redisClient.set('blockCount', 0);

        provider.on(filter, async (log: ethers.providers.Log) => {
            await this._filterAndProcessEvent(log);
            database.redisClient.set('lastBlock', log.blockNumber);
            const blockCount = await database.redisClient.get('blockCount');

            if (!!blockCount && blockCount > '16560') {
                services.app.ImMetadataService.setLastBlock(log.blockNumber);
                database.redisClient.set('blockCount', 0);
            } else {
                database.redisClient.incr('blockCount');
            }
        });
    }

    async _filterAndProcessEvent(log: ethers.providers.Log) {
        let parsedLog: ethers.utils.LogDescription | undefined;
        if (log.address === config.communityAdminAddress) {
            await this._processCommunityAdminEvents(log);
        } else if (this.communities.get(log.address)) {
            parsedLog = await this._processCommunityEvents(log);
        } else if (log.address === config.microcreditContractAddress) {
            await this._processMicrocreditEvents(log);
        }
        return parsedLog;
    }

    async _processCommunityAdminEvents(
        log: ethers.providers.Log
    ): Promise<ethers.utils.LogDescription | undefined> {
        const parsedLog = this.ifaceCommunityAdmin.parseLog(log);
        let result: ethers.utils.LogDescription | undefined = undefined;

        if (parsedLog.name === 'CommunityRemoved') {
            const communityAddress = parsedLog.args[0];
            const community = await database.models.community.findOne({
                attributes: ['id'],
                where: { contractAddress: communityAddress },
            });

            if (!community || !community.id) {
                utils.Logger.error(
                    `Community with address ${communityAddress} wasn't found at "CommunityRemoved"`
                );
            } else {
                await database.models.community.update(
                    {
                        status: 'removed',
                        deletedAt: new Date(),
                    },
                    {
                        where: { contractAddress: communityAddress },
                    }
                );

                this.communities.delete(communityAddress);
                result = parsedLog;
            }
        } else if (parsedLog.name === 'CommunityAdded') {
            const communityAddress = parsedLog.args[0];
            const managerAddress = parsedLog.args[1];

            const community = await database.models.community.update(
                {
                    contractAddress: communityAddress,
                    status: 'valid',
                },
                {
                    where: {
                        requestByAddress: managerAddress[0],
                    },
                    returning: true,
                }
            );
            if (community[0] === 0) {
                utils.Logger.error(
                    `Community with address ${communityAddress} wasn't updated at "CommunityAdded"`
                );
            } else {
                this.communities.set(communityAddress, community[1][0].id);
            }

            result = parsedLog;
        }

        return result;
    }

    async _processCommunityEvents(
        log: ethers.providers.Log
    ): Promise<ethers.utils.LogDescription | undefined> {
        let parsedLog = this.ifaceCommunity.parseLog(log);
        let result: ethers.utils.LogDescription | undefined = undefined;

        if (parsedLog.name === 'BeneficiaryAdded') {
            const communityAddress = log.address;
            const community = this.communities.get(communityAddress);

            if (community) {
                utils.cache.cleanBeneficiaryCache(community);
            }
                
            result = parsedLog;
        } else if (parsedLog.name === 'BeneficiaryRemoved') {
            const communityAddress = log.address;
            const community = this.communities.get(communityAddress);

            if (community) {
                utils.cache.cleanBeneficiaryCache(community);
            }
                
            result = parsedLog;
        }
        return result;
    }

    async _processMicrocreditEvents(log: ethers.providers.Log): Promise<ethers.utils.LogDescription | undefined> {
        let parsedLog = this.ifaceMicrocredit.parseLog(log);
        let result: ethers.utils.LogDescription | undefined = undefined;
        const userAddress = parsedLog.args[0];

        if (parsedLog.name === 'LoanAdded') {
            const user = await models.appUser.findOne({
                attributes: ['id', 'language', 'walletPNT', 'appPNT'],
                where: {
                    address: ethers.utils.getAddress(userAddress)
                }
            });

            if (user) {
                await sendNotification([user.toJSON()], NotificationType.LOAN_ADDED);
            }

            result = parsedLog;
        }

        return result;
    }
}

export { ChainSubscribers };