'use strict';

const axios = require('axios');
const BigNumber = require('bignumber.js');
const { ethers } = require('ethers');

const CommunityContractABI = require('../../contracts/CommunityABI.json');
const ERC20ABI = require('../../contracts/ERC20ABI.json');

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
        const Beneficiary = await queryInterface.sequelize.define(
            'beneficiary',
            {
                id: {
                    type: Sequelize.INTEGER,
                    autoIncrement: true,
                    primaryKey: true,
                },
                address: {
                    type: Sequelize.STRING(44),
                    allowNull: false,
                },
                communityId: {
                    type: Sequelize.UUID,
                    references: {
                        model: 'community', // name of Target model
                        key: 'publicId', // key in Target model that we're referencing
                    },
                    onDelete: 'RESTRICT',
                    allowNull: true,
                },
                active: {
                    type: Sequelize.BOOLEAN,
                    defaultValue: true,
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
                claims: {
                    type: Sequelize.INTEGER,
                    defaultValue: 0,
                    allowNull: false,
                },
                lastClaimAt: {
                    type: Sequelize.DATE,
                    allowNull: true,
                },
                penultimateClaimAt: {
                    type: Sequelize.DATE,
                    allowNull: true,
                },
                createdAt: {
                    allowNull: false,
                    type: Sequelize.DATE,
                },
                updatedAt: {
                    allowNull: false,
                    type: Sequelize.DATE,
                },
            },
            {
                tableName: 'beneficiary',
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

        const BeneficiaryTransaction = await queryInterface.sequelize.define(
            'beneficiarytransaction',
            {
                id: {
                    type: Sequelize.INTEGER,
                    autoIncrement: true,
                    primaryKey: true,
                },
                beneficiary: {
                    type: Sequelize.STRING(44),
                    allowNull: false,
                },
                withAddress: {
                    type: Sequelize.STRING(44),
                    allowNull: false,
                },
                amount: {
                    // https://github.com/sequelize/sequelize/blob/2874c54915b2594225e939809ca9f8200b94f454/lib/dialects/postgres/data-types.js#L102
                    type: Sequelize.DECIMAL(26), // max 99,999,999 - plus 18 decimals
                    allowNull: false,
                },
                isFromBeneficiary: {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                },
                tx: {
                    type: Sequelize.STRING(68),
                    unique: true,
                    allowNull: false,
                },
                date: {
                    type: Sequelize.DATEONLY,
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
                tableName: 'beneficiarytransaction',
                sequelize: queryInterface.sequelize, // this bit is important
            }
        );

        const Claim = await queryInterface.sequelize.define(
            'claim',
            {
                id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    autoIncrement: true,
                    primaryKey: true,
                },
                address: {
                    type: Sequelize.STRING(44),
                    allowNull: false,
                },
                communityId: {
                    type: Sequelize.UUID,
                    references: {
                        model: 'community', // name of Target model
                        key: 'publicId', // key in Target model that we're referencing
                    },
                    onDelete: 'RESTRICT',
                    allowNull: false,
                },
                amount: {
                    // https://github.com/sequelize/sequelize/blob/2874c54915b2594225e939809ca9f8200b94f454/lib/dialects/postgres/data-types.js#L102
                    type: Sequelize.DECIMAL(24), // max 999,999 - plus 18 decimals
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
                tableName: 'claim',
                sequelize: queryInterface.sequelize, // this bit is important
            }
        );

        const Inflow = await queryInterface.sequelize.define(
            'inflow',
            {
                id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    autoIncrement: true,
                    primaryKey: true,
                },
                from: {
                    type: Sequelize.STRING(44),
                    allowNull: false,
                },
                communityId: {
                    type: Sequelize.UUID,
                    references: {
                        model: 'community', // name of Target model
                        key: 'publicId', // key in Target model that we're referencing
                    },
                    onDelete: 'RESTRICT',
                    allowNull: false,
                },
                amount: {
                    // https://github.com/sequelize/sequelize/blob/2874c54915b2594225e939809ca9f8200b94f454/lib/dialects/postgres/data-types.js#L102
                    type: Sequelize.DECIMAL(29), // max 9,999,999,999 - plus 18 decimals
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
                tableName: 'inflow',
                sequelize: queryInterface.sequelize, // this bit is important
            }
        );

        const ifaceCommunity = new ethers.utils.Interface(CommunityContractABI);
        const ifaceERC20 = new ethers.utils.Interface(ERC20ABI);
        // const allBeneficiaryAddressses = await BeneficiaryService.getAllAddresses();
        const availableCommunities = await Community.findAll({
            where: {
                status: 'valid',
                visibility: {
                    [Sequelize.Op.or]: ['public', 'private'],
                },
            },
        });
        const allCommunitiesAddresses = availableCommunities.map(
            (c) => c.contractAddress
        );

        const publicCommunities = (
            await Community.findAll({
                attributes: ['publicId'],
                where: { visibility: 'public', status: 'valid' },
            })
        ).map((c) => c.contractAddress);

        const beneficiariesInPublicCommunities = (
            await Beneficiary.findAll({
                attributes: ['address'],
                where: {
                    communityId: { [Sequelize.Op.in]: publicCommunities },
                    active: true,
                },
            })
        ).map((b) => b.address);
        const provider = new ethers.providers.JsonRpcProvider(
            process.env.CHAIN_JSON_RPC_URL
        );
        // get past community events
        for (let c = 0; c < availableCommunities.length; c++) {
            const logsCommunity = await provider.getLogs({
                address: availableCommunities[c].contractAddress,
                fromBlock: 4578063, // January-12-2021 03:38:05 PM +1 UTC
                toBlock: 'latest',
                topics: [
                    [
                        // ethers.utils.id('ManagerAdded(address)'),
                        // ethers.utils.id('ManagerRemoved(address)'),
                        // ethers.utils.id('BeneficiaryAdded(address)'),
                        // ethers.utils.id('BeneficiaryLocked(address)'),
                        // ethers.utils.id('BeneficiaryRemoved(address)'),
                        ethers.utils.id('BeneficiaryClaim(address,uint256)'),
                        // ethers.utils.id('CommunityEdited(uint256,uint256,uint256,uint256)'),
                    ],
                ],
            });

            const eventsCommunity = logsCommunity.map((log) =>
                ifaceCommunity.parseLog(log)
            );

            // save community events
            for (let ec = 0; ec < eventsCommunity.length; ec += 1) {
                const log = logsCommunity[ec];
                const parsedLog = eventsCommunity[ec];
                let txAt;
                if (parsedLog.name === 'BeneficiaryClaim') {
                    console.log('BeneficiaryClaim');
                    const beneficiaryAddress = parsedLog.args[0];
                    const amount = parsedLog.args[1];
                    // const communityId = allCommunities.get(log.address)!;
                    try {
                        txAt = await getBlockTime(log.blockHash);
                        await Claim.create({
                            address: beneficiaryAddress,
                            communityId: availableCommunities[c].publicId,
                            amount,
                            tx: log.transactionHash,
                            txAt,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        });
                    } catch (e) {}
                }
            }
            // get past donations
            const logsCUSD = await provider.getLogs({
                fromBlock: 4578063, // January-12-2021 03:38:05 PM +1 UTC
                toBlock: 'latest',
                topics: [
                    [ethers.utils.id('Transfer(address,address,uint256)')],
                ],
            });
            const eventsCUSD = logsCUSD.map((log) => ifaceERC20.parseLog(log));
            for (let ec = 0; ec < eventsCUSD.length; ec += 1) {
                const preParsedLog = eventsCUSD[ec];
                if (
                    eventsCUSD[ec].args.to ===
                    availableCommunities[c].contractAddress
                ) {
                    console.log('Transfer');
                    const log = logsCUSD[ec];
                    const parsedLog = eventsCUSD[ec];
                    const from = parsedLog.args[0];
                    // const toCommunityAddress = parsedLog.args[1];
                    // const communityId = allCommunities.get(toCommunityAddress)!;
                    const amount = parsedLog.args[2].toString();
                    try {
                        const txAt = await getBlockTime(log.blockHash);
                        await Inflow.create({
                            from,
                            communityId: availableCommunities[c].publicId,
                            amount,
                            tx: log.transactionHash,
                            txAt,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        });
                    } catch (e) {}
                } else if (
                    // same as in subscribe
                    !allCommunitiesAddresses.includes(preParsedLog.args[0]) &&
                    // (beneficiariesInPublicCommunities.includes(
                    //     preParsedLog.args[0]
                    // ) ||
                    //     beneficiariesInPublicCommunities.includes(
                    //         preParsedLog.args[1]
                    //     )) &&
                    preParsedLog.args[1] !==
                        '0xdC553892cdeeeD9f575aa0FBA099e5847fd88D20' &&
                    preParsedLog.args[0] !== preParsedLog.args[1] &&
                    preParsedLog.args[2].toString().length > 15
                ) {
                    const isFromBeneficiary =
                        beneficiariesInPublicCommunities.includes(
                            preParsedLog.args[0]
                        );
                    // transactions from or to beneficiaries
                    if (
                        isFromBeneficiary ||
                        beneficiariesInPublicCommunities.includes(
                            preParsedLog.args[1]
                        )
                    ) {
                        const log = logsCUSD[ec];
                        const _parsedLog = preParsedLog; // TODO: rename to parsedLog
                        const beneficiaryAddress = isFromBeneficiary
                            ? _parsedLog.args[0]
                            : _parsedLog.args[1];
                        const withAddress = isFromBeneficiary
                            ? _parsedLog.args[1]
                            : _parsedLog.args[0];
                        // save to table to calculate txs and volume
                        try {
                            await BeneficiaryTransaction.create({
                                beneficiary: beneficiaryAddress,
                                withAddress,
                                amount: _parsedLog.args[2].toString(),
                                isFromBeneficiary,
                                tx: log.transactionHash,
                                date: new Date(),
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            });
                        } catch (e) {}
                    }
                }
            }
        }
    },
    down: (queryInterface) => {},
};
