'use strict';

const axios = require('axios');
const BigNumber = require('bignumber.js');
const { ethers } = require('ethers');

const CommunityContractABI = require('../../contracts/CommunityABI.json');

BigNumber.config({ EXPONENTIAL_AT: [-7, 30] });

async function getBlockTime(blockHash) {
    try {
        const requestContent = {
            id: 0,
            jsonrpc: '2.0',
            method: 'eth_getBlockByHash',
            params: [blockHash, false],
        };
        // handle success
        const requestHeaders = {
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
        };
        const response = await axios.post(
            process.env.CHAIN_JSON_RPC_URL,
            requestContent,
            requestHeaders
        );
        return new Date(parseInt(response.data.result.timestamp, 16) * 1000);
    } catch (e) {
        console.log('getBlockTime ' + e);
        return new Date();
    }
}

// eslint-disable-next-line no-undef
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const UbiBeneficiaryRegistry = await queryInterface.sequelize.define(
            'ubi_beneficiary_registry',
            {
                id: {
                    type: Sequelize.INTEGER,
                    autoIncrement: true,
                    primaryKey: true,
                },
                address: {
                    type: Sequelize.STRING(44),
                    references: {
                        model: 'user',
                        key: 'address',
                    },
                    onDelete: 'RESTRICT',
                    allowNull: false,
                },
                from: {
                    type: Sequelize.STRING(44),
                    references: {
                        model: 'user',
                        key: 'address',
                    },
                    onDelete: 'RESTRICT',
                    allowNull: false,
                },
                communityId: {
                    type: Sequelize.INTEGER,
                    references: {
                        model: 'community',
                        key: 'id',
                    },
                    onDelete: 'CASCADE',
                    allowNull: false,
                },
                activity: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                },
                tx: {
                    type: Sequelize.STRING(68),
                    unique: true,
                    allowNull: false,
                },
                txAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                },
            },
            {
                tableName: 'ubi_beneficiary_registry',
                sequelize: queryInterface.sequelize, // this bit is important
            }
        );

        const Community = await queryInterface.sequelize.define(
            'community',
            {
                id: {
                    type: Sequelize.INTEGER,
                    autoIncrement: true,
                    primaryKey: true,
                },
                publicId: {
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4,
                    unique: true,
                    allowNull: false,
                },
                requestByAddress: {
                    type: Sequelize.STRING(44),
                    unique: true,
                    allowNull: false,
                },
                contractAddress: {
                    type: Sequelize.STRING(44),
                },
                name: {
                    type: Sequelize.STRING(64),
                    allowNull: false,
                },
                description: {
                    type: Sequelize.STRING(1024),
                    allowNull: false,
                },
                descriptionEn: {
                    type: Sequelize.STRING(1024),
                    allowNull: true,
                },
                language: {
                    type: Sequelize.STRING(8),
                    defaultValue: 'en',
                    allowNull: false,
                },
                currency: {
                    type: Sequelize.STRING(4),
                    defaultValue: 'USD',
                    allowNull: false,
                },
                city: {
                    type: Sequelize.STRING(64),
                    allowNull: false,
                },
                country: {
                    type: Sequelize.STRING(64),
                    allowNull: false,
                },
                gps: {
                    type: Sequelize.JSON,
                    allowNull: false,
                },
                email: {
                    type: Sequelize.STRING(64),
                    allowNull: false,
                },
                visibility: {
                    type: Sequelize.ENUM('public', 'private'),
                    allowNull: false,
                },
                coverImage: {
                    type: Sequelize.STRING(128),
                    allowNull: false,
                },
                status: {
                    type: Sequelize.ENUM('pending', 'valid', 'removed'),
                    allowNull: false,
                },
                createdAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                },
                updatedAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                },
            },
            {
                tableName: 'community',
                sequelize: queryInterface.sequelize, // this bit is important
            }
        );

        const ifaceCommunity = new ethers.utils.Interface(CommunityContractABI);
        const availableCommunities = await Community.findAll({
            where: {
                status: 'valid',
            },
        });

        const provider = new ethers.providers.JsonRpcProvider(
            process.env.CHAIN_JSON_RPC_URL
        );
        // get past community events
        for (let c = 0; c < availableCommunities.length; c++) {
            const logsCommunity = await provider.getLogs({
                address: availableCommunities[c].contractAddress,
                fromBlock: 2578063, // September-18-2020 10:35:31 PM +1 UTC
                toBlock: 'latest',
                topics: [
                    [
                        // ethers.utils.id('ManagerAdded(address)'),
                        // ethers.utils.id('ManagerRemoved(address)'),
                        ethers.utils.id('BeneficiaryAdded(address)'),
                        // ethers.utils.id('BeneficiaryLocked(address)'),
                        ethers.utils.id('BeneficiaryRemoved(address)'),
                        // ethers.utils.id('BeneficiaryClaim(address,uint256)'),
                        // ethers.utils.id('CommunityEdited(uint256,uint256,uint256,uint256)'),
                    ],
                ],
            });

            const eventsCommunity = logsCommunity.map((log) =>
                ifaceCommunity.parseLog(log)
            );

            for (let ec = 0; ec < eventsCommunity.length; ec += 1) {
                const log = logsCommunity[ec];
                const parsedLog = eventsCommunity[ec];
                let txAt;
                if (parsedLog.name === 'BeneficiaryAdded') {
                    const beneficiaryAddress = parsedLog.args[0];
                    try {
                        txAt = await getBlockTime(log.blockHash);
                        const txResponse = await this.provider.getTransaction(
                            log.transactionHash
                        );
                        await UbiBeneficiaryRegistry.create({
                            address: beneficiaryAddress,
                            from: txResponse.from,
                            communityId: availableCommunities[c].id,
                            activity: 0,
                            tx: log.transactionHash,
                            txAt,
                        });
                    } catch (e) {}
                } else if (parsedLog.name === 'BeneficiaryRemoved') {
                    const beneficiaryAddress = parsedLog.args[0];
                    try {
                        txAt = await getBlockTime(log.blockHash);
                        const txResponse = await this.provider.getTransaction(
                            log.transactionHash
                        );
                        await UbiBeneficiaryRegistry.create({
                            address: beneficiaryAddress,
                            from: txResponse.from,
                            communityId: availableCommunities[c].id,
                            activity: 1,
                            tx: log.transactionHash,
                            txAt,
                        });
                    } catch (e) {}
                }
            }
        }
    },
    down: (queryInterface) => {},
};
