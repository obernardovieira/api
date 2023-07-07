import { Op } from 'sequelize';
import { ethers } from 'ethers';
import { getAddress } from '@ethersproject/address';

import { AppNotification } from '../../../interfaces/app/appNotification';
import { AppUserCreationAttributes, AppUserUpdate } from '../../../interfaces/app/appUser';
import { AppUserModel } from '../../../database/models/app/appUser';
import { BaseError } from '../../../utils/baseError';
import { LogTypes } from '../../../interfaces/app/appLog';
import { ProfileContentStorage } from '../../../services/storage';
import { UserRoles, getUserRoles } from '../../../subgraph/queries/user';
import { generateAccessToken } from '../../../utils/jwt';
import { getAllBeneficiaries } from '../../../subgraph/queries/beneficiary';
import { models } from '../../../database';
import { sendFirebasePushNotification } from '../../../utils/pushNotification';
import { utils } from '../../../..';
import UserLogService from './log';
import config from '../../../config';

export default class UserService {
    private userLogService = new UserLogService();
    private profileContentStorage = new ProfileContentStorage();

    public async create(
        userParams: AppUserCreationAttributes,
        overwrite: boolean = false,
        recover: boolean = false,
        clientId?: string
    ) {
        const exists = await this._exists(userParams.address);

        if (overwrite) {
            await this._overwriteUser(userParams);
        }

        if (recover) {
            await this._recoverAccount(userParams.address);
        }

        let user: AppUserModel;
        let userRoles: UserRoles = {
            ambassador: null,
            beneficiary: null,
            borrower: null,
            councilMember: null,
            manager: null,
            loanManager: null
        };
        let userRules: {
            beneficiaryRules?: boolean;
            managerRules?: boolean;
        } = {};

        // validate to both existing and new accounts
        if (userParams.phone) {
            const existsPhone = userParams.phone
                ? await this._existsAccountByPhone(userParams.phone, userParams.address)
                : false;

            if (existsPhone) {
                throw new BaseError('PHONE_CONFLICT', 'phone associated with another account');
            }
        }

        if (!exists) {
            // create new user
            // including their phone number information, if it exists
            user = await models.appUser.create(userParams);
        } else {
            const findAndUpdate = async () => {
                // it's not null at this point
                const _user = (await models.appUser.findOne({
                    where: { address: userParams.address }
                }))!;

                if (!_user.active) {
                    throw new BaseError('INACTIVE_USER', 'user is inactive');
                }

                if (_user.deletedAt) {
                    throw new BaseError('DELETION_PROCESS', 'account in deletion process');
                }

                // if a phone number is provided, verify if it
                // is associated with another account
                // and if not, update the user's phone number
                const jsonUser = _user.toJSON();
                if (userParams.phone && userParams.phone !== jsonUser.phone) {
                    await models.appUser.update(
                        {
                            phone: userParams.phone
                        },
                        {
                            where: {
                                id: jsonUser.id
                            }
                        }
                    );
                    _user.phone = userParams.phone;
                }

                const pushNotification = {
                    walletPNT: userParams.walletPNT,
                    appPNT: userParams.appPNT
                };

                await models.appUser.update(
                    {
                        ...pushNotification
                    },
                    { where: { address: userParams.address } }
                );

                return _user;
            };

            [user, userRoles, userRules] = await Promise.all([
                findAndUpdate(),
                this._userRoles(userParams.address),
                this._userRules(userParams.address)
            ]);
        }

        this._updateLastLogin(user.id);

        let token: string;
        if (clientId) {
            const credential = await models.appClientCredential.findOne({
                where: {
                    clientId,
                    status: 'active'
                }
            });
            if (credential) {
                token = generateAccessToken(userParams.address, user.id, clientId);
            } else {
                throw new BaseError('INVALID_CREDENTIAL', 'Client credential is invalid');
            }
        } else {
            // generate access token for future interactions that require authentication
            token = generateAccessToken(userParams.address, user.id);
        }

        const jsonUser = user.toJSON();
        return {
            ...jsonUser,
            ...userRoles,
            ...userRules,
            token
        };
    }

    public async get(address: string) {
        const [user, userRoles, userRules] = await Promise.all([
            models.appUser.findOne({
                where: { address }
            }),
            this._userRoles(address),
            this._userRules(address)
        ]);

        if (user === null) {
            throw new BaseError('USER_NOT_FOUND', 'user not found');
        }

        return {
            ...user.toJSON(),
            ...userRoles,
            ...userRules
        };
    }

    public async getUserFromAuthorizedAccount(address: string, authoriedAddress: string) {
        const { ambassador, manager, councilMember, loanManager } = await this._userRoles(authoriedAddress);

        if (!ambassador && !manager && !councilMember && !loanManager) {
            throw new BaseError(
                'UNAUTHORIZED',
                'user must be ambassador, ubi manager, loand manager or council member'
            );
        }

        return await this.get(address);
    }

    public async update(user: AppUserUpdate) {
        if (user.phone) {
            const existsPhone = await this._existsAccountByPhone(user.phone, user.address);

            if (existsPhone) throw new BaseError('PHONE_CONFLICT', 'phone associated with another account');
        }

        const updated = await models.appUser.update(user, {
            returning: true,
            where: { address: user.address }
        });
        if (updated[0] === 0) {
            throw new BaseError('UPDATE_FAILED', 'user was not updated!');
        }

        this.userLogService.create(updated[1][0].id, LogTypes.EDITED_PROFILE, user);

        return {
            ...updated[1][0].toJSON(),
            ...(await this._userRoles(user.address)),
            ...(await this._userRules(user.address))
        };
    }

    public async patch(address: string, action: string) {
        if (action === 'beneficiary-rules') {
            await models.appUser.update(
                { readBeneficiaryRules: true },
                {
                    where: { address }
                }
            );
        } else if (action === 'manager-rules') {
            await models.manager.update(
                { readRules: true },
                {
                    where: { address }
                }
            );
        }
    }

    public async delete(address: string) {
        const roles = await getUserRoles(address);

        if (roles.manager !== null && roles.manager.state === 0) {
            throw new BaseError('MANAGER', "Active managers can't delete accounts");
        }

        const updated = await models.appUser.update(
            {
                deletedAt: new Date()
            },
            {
                where: {
                    address
                },
                returning: true
            }
        );

        if (updated[0] === 0) {
            throw new BaseError('UPDATE_FAILED', 'User was not updated');
        }
        return updated[1][0].toJSON();
    }

    public async report(message: string, communityId: number, category: 'general' | 'potential-fraud') {
        await models.appAnonymousReport.create({
            message,
            communityId,
            category
        });
        return true;
    }

    public async getReport(
        user: string,
        query: {
            offset?: string;
            limit?: string;
            community?: number;
        }
    ) {
        const userRoles = await getUserRoles(user);

        if (!userRoles.ambassador || userRoles.ambassador.communities.length === 0) {
            throw new BaseError('COMMUNITY_NOT_FOUND', 'no community found for this ambassador');
        }

        const { communities } = userRoles.ambassador;
        const communityId = query.community;
        let addresses: string[] = [];

        if (communityId) {
            const community = await models.community.findOne({
                attributes: ['contractAddress'],
                where: {
                    id: communityId
                }
            });

            if (!community?.contractAddress || communities.indexOf(community?.contractAddress?.toLowerCase()) === -1) {
                throw new BaseError('NOT_AMBASSADOR', 'user is not an ambassador of this community');
            }
            addresses.push(community.contractAddress);
        } else {
            addresses = communities;
        }

        return models.appAnonymousReport.findAndCountAll({
            include: [
                {
                    attributes: ['id', 'contractAddress', 'name', 'coverMediaPath'],
                    model: models.community,
                    as: 'community',
                    where: {
                        contractAddress: {
                            [Op.in]: addresses.map(c => getAddress(c))
                        }
                    }
                }
            ],
            offset: query.offset ? parseInt(query.offset, 10) : config.defaultOffset,
            limit: query.limit ? parseInt(query.limit, 10) : config.defaultLimit
        });
    }

    public async getPresignedUrlMedia(mime: string): Promise<{
        uploadURL: string;
        filename: string;
    }> {
        return this.profileContentStorage.getPresignedUrlPutObject(mime);
    }

    private async _recoverAccount(address: string) {
        try {
            await models.appUser.update(
                {
                    deletedAt: null
                },
                {
                    where: { address }
                }
            );
        } catch (error) {
            throw new BaseError('UNEXPECTED_ERROR', error.message);
        }
    }

    public async getNotifications(
        query: {
            offset?: string;
            limit?: string;
            isWallet?: string;
            isWebApp?: string;
        },
        userId: number
    ): Promise<{
        count: number;
        rows: AppNotification[];
    }> {
        const notifications = await models.appNotification.findAndCountAll({
            where: {
                userId,
                isWebApp: query.isWebApp === 'true',
                isWallet: query.isWallet === 'true'
            },
            offset: query.offset ? parseInt(query.offset, 10) : config.defaultOffset,
            limit: query.limit ? parseInt(query.limit, 10) : config.defaultLimit,
            order: [['createdAt', 'DESC']]
        });
        return {
            count: notifications.count,
            rows: notifications.rows as AppNotification[]
        };
    }

    public async readNotifications(userId: number, notifications?: number[]): Promise<boolean> {
        const updated = await models.appNotification.update(
            {
                read: true
            },
            {
                returning: true,
                where: {
                    userId,
                    id: {
                        [Op.in]: notifications
                    }
                }
            }
        );
        if (updated[0] === 0) {
            throw new BaseError('UPDATE_FAILED', 'notifications were not updated!');
        }
        return true;
    }

    public async getUnreadNotifications(
        userId: number,
        query: {
            isWallet?: string;
            isWebApp?: string;
        }
    ): Promise<number> {
        return models.appNotification.count({
            where: {
                userId,
                read: false,
                isWebApp: query.isWebApp === 'true',
                isWallet: query.isWallet === 'true'
            }
        });
    }

    public async sendPushNotifications(
        title: string,
        body: string,
        country?: string,
        communitiesIds?: number[],
        data?: any
    ) {
        if (country) {
            const users = await models.appUser.findAll({
                attributes: ['walletPNT'],
                where: {
                    country,
                    walletPNT: {
                        [Op.not]: null
                    }
                }
            });
            sendFirebasePushNotification(
                users.map(el => el.walletPNT!),
                title,
                body,
                data
            ).catch(error => utils.Logger.error('sendFirebasePushNotification' + error));
        } else if (communitiesIds && communitiesIds.length) {
            const communities = await models.community.findAll({
                attributes: ['contractAddress'],
                where: {
                    id: {
                        [Op.in]: communitiesIds
                    },
                    contractAddress: {
                        [Op.not]: null
                    }
                }
            });
            const beneficiaryAddress: string[] = [];

            // get beneficiaries
            for (let index = 0; index < communities.length; index++) {
                const community = communities[index];
                const beneficiaries = await getAllBeneficiaries(community.contractAddress!);
                beneficiaries.forEach(beneficiary => {
                    beneficiaryAddress.push(ethers.utils.getAddress(beneficiary.address));
                });
            }
            // get users
            const users = await models.appUser.findAll({
                attributes: ['walletPNT'],
                where: {
                    address: {
                        [Op.in]: beneficiaryAddress
                    },
                    walletPNT: {
                        [Op.not]: null
                    }
                }
            });
            sendFirebasePushNotification(
                users.map(el => el.walletPNT!),
                title,
                body,
                data
            ).catch(error => utils.Logger.error('sendFirebasePushNotification' + error));
        } else {
            throw new BaseError('INVALID_OPTION', 'invalid option');
        }
    }

    private async _overwriteUser(user: AppUserCreationAttributes) {
        try {
            const usersToInactive = await models.appUser.findAll({
                where: {
                    phone: user.phone,
                    address: {
                        [Op.not]: user.address
                    }
                }
            });

            const promises = usersToInactive.map(el =>
                models.appUser.update(
                    {
                        active: false
                    },
                    {
                        where: {
                            address: el.address
                        }
                    }
                )
            );

            promises.push(
                models.appUser.update(
                    {
                        active: true
                    },
                    {
                        where: {
                            address: user.address
                        }
                    }
                )
            );

            await Promise.all(promises);
        } catch (error) {
            throw new BaseError('UNEXPECTED_ERROR', error.message);
        }
    }

    private async _exists(address: string): Promise<boolean> {
        const exists = await models.appUser.findOne({
            attributes: ['address'],
            where: { address },
            raw: true
        });
        return exists !== null;
    }

    /**
     * Verify if there is any other account different than `address`
     * with the same `phone`.
     * @param phone number to verify
     * @param address address to verify
     * @returns {bool} true if there is any other account with the same phone
     */
    private async _existsAccountByPhone(phone: string, address: string): Promise<boolean> {
        const user = await models.appUser.findOne({
            where: {
                phone,
                address: {
                    [Op.not]: address
                },
                active: true
            }
        });

        return !!user;
    }

    private async _updateLastLogin(id: number): Promise<void> {
        await models.appUser.update({ lastLogin: new Date() }, { where: { id } });
    }

    private async _userRoles(address: string) {
        const [userRoles, user] = await Promise.all([
            getUserRoles(address),
            models.appUser.findOne({
                attributes: ['id', 'address'],
                where: { address },
                include: [
                    {
                        model: models.microCreditForm,
                        as: 'microCreditForm',
                        required: false
                    }
                ]
            })
        ]);

        const roles: string[] = [];
        const keys = Object.keys(userRoles);

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (userRoles[key] && (userRoles[key].state === 0 || userRoles[key].status === 0 || userRoles[key].id)) {
                if (key === 'manager' || key === 'beneficiary') {
                    // validate community locally
                    const community = await models.community.findOne({
                        attributes: ['id'],
                        where: {
                            contractAddress: getAddress(userRoles[key]!.community),
                            status: 'valid'
                        }
                    });

                    if (community) {
                        roles.push(key);
                    } else {
                        delete userRoles[key];
                    }
                } else {
                    roles.push(key);
                }
            }
        }

        const pendingCommunity = await models.community.findOne({
            where: {
                status: 'pending',
                requestByAddress: address
            }
        });
        if (pendingCommunity) roles.push('pendingManager');
        if (roles.length === 0) roles.push('donor');

        // pending borrowers also need to be listed as borrower
        // so that the loan manager can see their profile and applications
        if (userRoles.borrower === null && user && user.microCreditForm) {
            roles.push('borrower');
        }

        return {
            ...userRoles,
            roles
        };
    }

    private async _userRules(address: string) {
        const [beneficiaryRules, managerRules] = await Promise.all([
            models.appUser.findOne({
                attributes: ['readBeneficiaryRules'],
                where: { address }
            }),
            models.manager.findOne({
                attributes: ['readRules'],
                where: { address }
            })
        ]);

        return {
            beneficiaryRules: beneficiaryRules?.readBeneficiaryRules,
            managerRules: managerRules?.readRules
        };
    }
}
