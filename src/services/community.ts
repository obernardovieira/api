import { Community } from '../db/models/community';
import { ethers } from 'ethers';
import config from '../config';
import ImpactMarketContractABI from '../contracts/ImpactMarketABI.json'
import CommunityContractABI from '../contracts/CommunityABI.json'
import TransactionsService from './transactions';
import { ICommunityContractParams, ICommunityInfo } from '../types';
import { Op } from 'sequelize';
import SSIService from './ssi';
import { notifyManagerAdded } from '../utils';
import CommunityDailyStateService from './communityDailyState';
import CommunityStateService from './communityState';
import CommunityDailyMetricsService from './communityDailyMetrics';
import CommunityContractService from './communityContract';


export default class CommunityService {
    public static async create(
        requestByAddress: string,
        name: string,
        contractAddress: string,
        description: string,
        language: string,
        currency: string,
        city: string,
        country: string,
        gps: {
            latitude: number,
            longitude: number,
        },
        email: string,
        coverImage: string,
        txReceipt: any,
        contractParams: ICommunityContractParams,
    ): Promise<Community> {
        // TODO: improve, insert with unique transaction (see sequelize eager loading)
        const newCommunity = await Community.create({
            requestByAddress,
            name,
            contractAddress,
            description,
            language,
            currency,
            city,
            country,
            gps,
            email,
            visibility: 'private',
            coverImage,
            status: 'valid',
            contractParams,
        });
        await CommunityContractService.add(
            newCommunity.publicId,
            contractParams,
        );
        await CommunityStateService.add(newCommunity.publicId);
        // TODO: also add one day to daily state with the unique transaction above
        await CommunityDailyStateService.populateNext5Days(newCommunity.publicId);
        // add tx manager
        const ifaceCommunity = new ethers.utils.Interface(CommunityContractABI);
        const eventsCoomunity: ethers.utils.LogDescription[] = [];
        for (let index = 0; index < txReceipt.logs.length; index++) {
            try {
                const parsedLog = ifaceCommunity.parseLog(txReceipt.logs[index]);
                eventsCoomunity.push(parsedLog);
            } catch (e) { }
        }
        const index = eventsCoomunity.findIndex(
            (event) => event !== null && event.name === 'ManagerAdded'
        );
        if (index !== -1) {
            const provider = new ethers.providers.JsonRpcProvider(config.jsonRpcUrl);
            await TransactionsService.add(provider, txReceipt.logs[index], eventsCoomunity[index]);
            // it's not necessary to register the event!
            return newCommunity;
        }
        // TODO: should return undefined
        return newCommunity;
    }

    public static async request(
        requestByAddress: string,
        name: string,
        description: string,
        language: string,
        currency: string,
        city: string,
        country: string,
        gps: {
            latitude: number,
            longitude: number,
        },
        email: string,
        coverImage: string,
        contractParams: ICommunityContractParams,
    ): Promise<Community> {
        // TODO: improve, insert with unique transaction (see sequelize eager loading)
        const community = await Community.create({
            requestByAddress,
            name,
            description,
            language,
            currency,
            city,
            country,
            gps,
            email,
            visibility: 'public',
            coverImage,
            status: 'pending',
            contractParams,
        });
        await CommunityContractService.add(
            community.publicId,
            contractParams,
        );
        await CommunityStateService.add(community.publicId);
        // TODO: also add one day to daily state with the unique transaction above
        await CommunityDailyStateService.populateNext5Days(community.publicId);
        return community;
    }

    public static async edit(
        publicId: string,
        name: string,
        description: string,
        currency: string,
        city: string,
        country: string,
        gps: {
            latitude: number,
            longitude: number,
        },
        email: string,
        visibility: string,
        coverImage: string,
    ): Promise<[number, Community[]]> {
        return Community.update({
            name,
            description,
            currency,
            city,
            country,
            gps,
            email,
            visibility,
            coverImage,
        }, { returning: true, where: { publicId } });
    }

    public static async accept(acceptanceTransaction: string, publicId: string): Promise<boolean> {
        const provider = new ethers.providers.JsonRpcProvider(config.jsonRpcUrl);
        const receipt = await provider.waitForTransaction(acceptanceTransaction);
        const ifaceImpactMarket = new ethers.utils.Interface(ImpactMarketContractABI);
        if (receipt.logs === undefined) {
            return true;
        }
        const eventsImpactMarket: ethers.utils.LogDescription[] = [];
        for (let index = 0; index < receipt.logs.length; index++) {
            try {
                const parsedLog = ifaceImpactMarket.parseLog(receipt.logs[index]);
                eventsImpactMarket.push(parsedLog);
            } catch (e) { }
        }
        const index = eventsImpactMarket.findIndex((event) => event !== null && event.name === 'CommunityAdded');
        if (index !== -1) {
            const communityContractAddress = eventsImpactMarket[index].args._communityAddress;
            const dbUpdate: [number, Community[]] = await Community.update(
                { contractAddress: communityContractAddress, status: 'valid', txCreationObj: null },
                { returning: true, where: { publicId } },
            );
            if (dbUpdate[0] === 1) {
                notifyManagerAdded(dbUpdate[1][0].requestByAddress, communityContractAddress);
                return true;
            }
            return false;
        }
        return true;
    }

    public static async getAll(status: string, onlyPublic: boolean = true): Promise<ICommunityInfo[]> {
        const result: ICommunityInfo[] = [];
        const communities = await Community.findAll({
            where: {
                status,
                visibility: onlyPublic ? 'public' : {
                    [Op.or]: [
                        'public',
                        'private'
                    ],
                }
            },
            order: [['createdAt', 'ASC']]
        });
        for (let index = 0; index < communities.length; index++) {
            result.push(await this.getCachedInfoToCommunity(communities[index]));
        }
        return result;
    }

    public static async getAllAddressesAndIds(): Promise<Map<string, string>> {
        const result = await Community.findAll({ attributes: ['contractAddress', 'publicId'], raw: true });
        return new Map(result.map((c) => [c.contractAddress, c.publicId]));
    }

    public static async findByFirstManager(requestByAddress: string): Promise<Community | null> {
        return Community.findOne({
            where: {
                requestByAddress,
                status: {
                    [Op.or]: [
                        'valid',
                        'pending'
                    ],
                }
            }
        });
    }

    public static async findByPublicId(publicId: string): Promise<ICommunityInfo | null> {
        const community = await Community.findOne({
            where: {
                publicId,
                status: {
                    [Op.or]: [
                        'valid',
                        'pending'
                    ],
                }
            },
            raw: true
        });
        if (community === null) {
            return null;
        }
        return await this.getCachedInfoToCommunity(community);
    }

    public static async findByContractAddress(contractAddress: string): Promise<ICommunityInfo | null> {
        const community = await Community.findOne({ where: { contractAddress }, raw: true });
        if (community === null) {
            return null;
        }
        return await this.getCachedInfoToCommunity(community);
    }

    public static async getNamesAndFromAddresses(addresses: string[]): Promise<Community[]> {
        return Community.findAll({
            attributes: ['contractAddress', 'name'],
            where: {
                contractAddress: {
                    [Op.in]: addresses
                }
            }
        });
    }

    private static async getCachedInfoToCommunity(community: Community): Promise<ICommunityInfo> {
        const communityState = await CommunityStateService.get(community.publicId);
        const communityMetrics = await CommunityDailyMetricsService.getLastMetrics(community.publicId);
        const contractParams = await CommunityContractService.get(community.publicId);
        const beneficiaries = await TransactionsService.getBeneficiariesInCommunity(community.contractAddress);
        const managers = await TransactionsService.getCommunityManagersInCommunity(community.contractAddress);
        const backers = await TransactionsService.getBackersInCommunity(community.contractAddress);
        let vars;
        if (contractParams !== null) {
            vars = {
                _claimAmount: contractParams.claimAmount,
                _baseInterval: contractParams.baseInterval.toString(),
                _incrementInterval: contractParams.incrementInterval.toString(),
                _maxClaim: contractParams.maxClaim,
            };
        }
        else if (community.visibility === 'public') {
            vars = await TransactionsService.getCommunityVars(community.contractAddress);
        } else {
            vars = community.txCreationObj;
        }

        const totalClaimed = communityState.claimed;
        const totalRaised = communityState.raised;
        const ssi = await SSIService.get(community.publicId);

        return {
            ...community,
            backers, // TODO: to remove
            beneficiaries,
            managers,
            ssi,
            totalClaimed: totalClaimed, // TODO: to remove
            totalRaised: totalRaised, // TODO: to remove
            vars,
            state: communityState,
            metrics: communityMetrics,
            contractParams,
        };
    }

    public static async mappedNames(): Promise<Map<string, string>> {
        const mapped = new Map<string, string>();
        const query = await Community.findAll({
            attributes: ['contractAddress', 'name'],
        });
        for (let index = 0; index < query.length; index++) {
            const element = query[index];
            mapped.set(element.contractAddress, element.name);
        }
        return mapped;
    }
}