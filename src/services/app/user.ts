import {
    AppAnonymousReport,
    AppAnonymousReportCreation,
} from '@interfaces/app/appAnonymousReport';
// import { AppMediaContent } from '@interfaces/app/appMediaContent';
// import { AppUserDeviceCreation } from '@interfaces/app/appUserDevice';
import { User, UserCreationAttributes } from '@interfaces/app/user';
import { CommunityAttributes } from '@models/ubi/community';
import { ProfileContentStorage } from '@services/storage';
import { Logger } from '@utils/logger';
import { Op } from 'sequelize';

import { generateAccessToken } from '../../api/middlewares';
import { models, sequelize } from '../../database';
import { IUserHello, IUserAuth } from '../../types/endpoints';
import CommunityService from '../ubi/community';
import ExchangeRatesService from './exchangeRates';

export default class UserService {
    public static sequelize = sequelize;
    public static anonymousReport = models.anonymousReport;
    public static user = models.user;
    public static beneficiary = models.beneficiary;
    public static manager = models.manager;
    public static appUserTrust = models.appUserTrust;
    public static appUserThroughTrust = models.appUserThroughTrust;
    // public static userDevice = models.userDevice;
    public static appMediaContent = models.appMediaContent;
    public static appMediaThumbnail = models.appMediaThumbnail;

    private static profileContentStorage = new ProfileContentStorage();

    public static async authenticate(
        address: string,
        language: string,
        currency: string | undefined,
        pushNotificationToken: string,
        phone?: string // until the user updates to new version, this can be undefined
    ): Promise<IUserAuth> {
        try {
            const token = generateAccessToken(address);
            let userResult = await this.user.findOne({
                include: [
                    {
                        model: this.appMediaContent,
                        as: 'avatar',
                        required: false,
                        include: [
                            {
                                model: this.appMediaThumbnail,
                                as: 'thumbnails',
                                separate: true,
                            },
                        ],
                    },
                ],
                where: { address },
            });
            if (userResult === null) {
                try {
                    await this.sequelize.transaction(async (t) => {
                        let createUser: UserCreationAttributes = {
                            address,
                            language,
                            pushNotificationToken,
                        };
                        if (currency) {
                            // TODO: temporary fix. Solved in mobile verion 1.1.0
                            if (currency.indexOf(',') !== -1) {
                                currency = currency.split(',')[0];
                            }
                            // TODO: temporary fix. Solved in mobile verion 1.1.2
                            if (currency.indexOf('MWK') !== -1) {
                                currency = 'USD';
                            }
                            createUser = {
                                ...createUser,
                                currency,
                            };
                        }
                        userResult = await this.user.create(createUser, {
                            transaction: t,
                        });
                        if (phone) {
                            const userTrust = await this.appUserTrust.create(
                                {
                                    phone,
                                },
                                { transaction: t }
                            );
                            await this.appUserThroughTrust.create(
                                {
                                    userAddress: address,
                                    appUserTrustId: userTrust.id,
                                },
                                { transaction: t }
                            );
                        }
                    });
                } catch (e) {
                    Logger.error('creating account ' + e);
                }
            } else {
                await this.user.update(
                    { pushNotificationToken },
                    { where: { address } }
                );
            }
            if (userResult === null) {
                throw new Error('User was not defined!');
            }
            const user = userResult.toJSON() as User;
            const userHello = await this.loadUser(user.address);
            return {
                token,
                user,
                ...userHello,
            };
        } catch (e) {
            Logger.warn(`Error while auth user ${address} ${e}`);
            throw new Error(e);
        }
    }

    public static async hello(
        address: string,
        phone?: string
    ): Promise<IUserHello> {
        const user = await this.user.findOne({
            include: [
                {
                    model: this.appUserTrust,
                    as: 'trust',
                    include: [
                        {
                            model: this.appUserTrust,
                            as: 'selfTrust',
                        },
                    ],
                },
            ],
            where: { address },
        });
        if (user === null) {
            throw new Error(address + ' user not found!');
        }
        if (phone) {
            const uu = user.toJSON() as User;
            const userTrustId =
                uu.trust && uu.trust.length > 0 ? uu.trust[0].id : undefined;
            if (userTrustId === undefined) {
                try {
                    await this.sequelize.transaction(async (t) => {
                        const userTrust = await this.appUserTrust.create(
                            {
                                phone,
                            },
                            { transaction: t }
                        );
                        await this.appUserThroughTrust.create(
                            {
                                userAddress: address,
                                appUserTrustId: userTrust.id,
                            },
                            { transaction: t }
                        );
                    });
                } catch (e) {
                    Logger.error(
                        'creating trust profile to existing account ' + e
                    );
                }
            }
        }
        return await UserService.loadUser(user.address);
    }

    public static async getPresignedUrlMedia(mime: string): Promise<{
        uploadURL: string;
        filename: string;
    }> {
        return this.profileContentStorage.getPresignedUrlPutObject(mime);
    }

    public static async updateAvatar(
        address: string,
        mediaId: number
    ): Promise<boolean> {
        const updated = await this.user.update(
            { avatarMediaId: mediaId },
            { returning: true, where: { address } }
        );
        return updated[0] > 0;
    }

    public static async setUsername(
        address: string,
        username: string
    ): Promise<boolean> {
        const updated = await this.user.update(
            { username },
            { returning: true, where: { address } }
        );
        return updated[0] > 0;
    }

    public static async setCurrency(
        address: string,
        currency: string
    ): Promise<boolean> {
        const updated = await this.user.update(
            { currency },
            { returning: true, where: { address } }
        );
        return updated[0] > 0;
    }

    public static async setPushNotificationsToken(
        address: string,
        pushNotificationToken: string
    ): Promise<boolean> {
        const updated = await this.user.update(
            { pushNotificationToken },
            { returning: true, where: { address } }
        );
        return updated[0] > 0;
    }

    public static async setLanguage(
        address: string,
        language: string
    ): Promise<boolean> {
        const updated = await this.user.update(
            { language },
            { returning: true, where: { address } }
        );
        return updated[0] > 0;
    }

    public static async setGender(
        address: string,
        gender: string
    ): Promise<boolean> {
        const updated = await this.user.update(
            { gender },
            { returning: true, where: { address } }
        );
        return updated[0] > 0;
    }

    public static async setYear(
        address: string,
        year: number | null
    ): Promise<boolean> {
        const updated = await this.user.update(
            { year },
            { returning: true, where: { address } }
        );
        return updated[0] > 0;
    }

    public static async setChildren(
        address: string,
        children: number | null
    ): Promise<boolean> {
        const updated = await this.user.update(
            { children },
            { returning: true, where: { address } }
        );
        return updated[0] > 0;
    }

    public static async setProfilePicture(
        address: string,
        file: Express.Multer.File
    ) {
        const user = await this.user.findOne({ where: { address } });
        const media = await this.profileContentStorage.uploadContent(file);
        await this.user.update(
            { avatarMediaId: media.id },
            { returning: true, where: { address } }
        );
        if (user!.avatarMediaId !== null && user!.avatarMediaId !== media.id) {
            await this.profileContentStorage.deleteContent(user!.avatarMediaId);
        }
        return media;
    }

    // public static async setDevice(
    //     deviceInfo: AppUserDeviceCreation
    // ): Promise<boolean> {
    //     const exists = await this.userDevice.findOne({
    //         where: {
    //             userAddress: deviceInfo.userAddress,
    //             identifier: deviceInfo.identifier,
    //             network: deviceInfo.network,
    //             device: deviceInfo.device,
    //         },
    //     });
    //     try {
    //         if (exists !== null) {
    //             await this.userDevice.update(
    //                 { lastLogin: new Date() },
    //                 {
    //                     where: {
    //                         userAddress: deviceInfo.userAddress,
    //                         identifier: deviceInfo.identifier,
    //                         network: deviceInfo.network,
    //                         device: deviceInfo.device,
    //                     },
    //                 }
    //             );
    //         } else {
    //             await this.userDevice.create(deviceInfo);
    //         }
    //         return true;
    //     } catch (e) {
    //         if (e.name === 'SequelizeUniqueConstraintError') {
    //             await this.userDevice.update(
    //                 { lastLogin: new Date() },
    //                 {
    //                     where: {
    //                         userAddress: deviceInfo.userAddress,
    //                         identifier: deviceInfo.identifier,
    //                         network: deviceInfo.network,
    //                         device: deviceInfo.device,
    //                     },
    //                 }
    //             );
    //             return true;
    //         }
    //     }
    //     return false;
    // }

    public static async get(address: string): Promise<User | null> {
        return this.user.findOne({ where: { address }, raw: true });
    }

    public static report(
        message: string,
        communityId: string | undefined,
        category: 'general' | 'potential-fraud' | undefined
    ): Promise<AppAnonymousReport> {
        let newReport: AppAnonymousReportCreation = { message };
        if (communityId) {
            newReport = {
                ...newReport,
                communityId,
            };
        }
        if (category) {
            newReport = {
                ...newReport,
                category,
            };
        }
        return this.anonymousReport.create(newReport);
    }

    public static async exists(address: string): Promise<boolean> {
        const exists = await this.user.findOne({
            attributes: ['address'],
            where: { address },
            raw: true,
        });
        console.log(exists);
        return exists !== null;
    }

    public static async getAllAddresses(): Promise<string[]> {
        return (
            await this.user.findAll({ attributes: ['address'], raw: true })
        ).map((u) => u.address);
    }

    public static async getPushTokensFromAddresses(
        addresses: string[]
    ): Promise<string[]> {
        const users = await this.user.findAll({
            attributes: ['pushNotificationToken'],
            where: { address: { [Op.in]: addresses } },
            raw: true,
        });
        return users
            .filter((u) => u.pushNotificationToken !== null)
            .map((u) => u.pushNotificationToken!);
    }

    /**
     * TODO: improve
     */
    private static async loadUser(userAddress: string): Promise<IUserHello> {
        const user = await this.user.findOne({
            include: [
                {
                    model: this.appUserTrust,
                    as: 'trust',
                    include: [
                        {
                            model: this.appUserTrust,
                            as: 'selfTrust',
                        },
                    ],
                },
            ],
            where: { address: userAddress },
        });
        if (user === null) {
            throw new Error('User is null?');
        }
        const fUser = user.toJSON() as User;
        const beneficiary = await this.beneficiary.findOne({
            where: { active: true, address: userAddress },
        });
        const manager = await this.manager.findOne({
            where: { active: true, address: userAddress },
        });

        // get user community
        // TODO: part of the block below should be removed
        let community: CommunityAttributes | null = null;
        let managerInPendingCommunity = false;
        // reusable method
        const getCommunity = async (publicId: string) => {
            const community = await CommunityService.getCommunityOnlyByPublicId(
                publicId
            );
            if (community !== null) {
                return CommunityService.findById(community.id);
            }
            return null;
        };
        if (beneficiary) {
            community = await getCommunity(beneficiary.communityId);
        } else if (manager) {
            community = await getCommunity(manager.communityId);
        } else {
            const communityId = await CommunityService.findByFirstManager(
                fUser.address
            );
            if (communityId) {
                community = await getCommunity(communityId);
                managerInPendingCommunity = true;
            }
        }
        // until here

        return {
            isBeneficiary: beneficiary !== null,
            isManager: manager !== null || managerInPendingCommunity,
            blocked: beneficiary !== null ? beneficiary.blocked : false,
            verifiedPN:
                fUser.trust?.length !== 0
                    ? fUser.trust![0].verifiedPhoneNumber
                    : undefined,
            suspect: fUser.suspect,
            rates: await ExchangeRatesService.get(),
            community: community ? community : undefined,
            communityId: community ? community.id : undefined,
        };
    }
}
