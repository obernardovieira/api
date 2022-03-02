import { Op, QueryTypes } from 'sequelize';

import { models, sequelize } from '../../../database';
import { AppUserModel } from '../../../database/models/app/appUser';
import {
    AppUser,
    AppUserCreationAttributes,
} from '../../../interfaces/app/appUser';
import { getUserRoles } from '../../../subgraph/queries/user';
import { BaseError } from '../../../utils/baseError';
import { generateAccessToken } from '../../../utils/jwt';
import { Logger } from '../../../utils/logger';

export default class UserService {
    public async create(
        userParams: AppUserCreationAttributes,
        overwrite: boolean = false,
        recover: boolean = false
    ) {
        const exists = await this._exists(userParams.address);

        if (overwrite) {
            await this._overwriteUser(userParams);
        } else {
            // a user might be connecting with the same phone number
            // as an existing user
            const existsPhone = userParams.trust?.phone
                ? await this._existsAccountByPhone(
                      userParams.trust.phone,
                      userParams.address
                  )
                : false;

            if (existsPhone)
                throw new BaseError(
                    'PHONE_CONFLICT',
                    'phone associated with another account'
                );
        }

        if (recover) {
            await this._recoverAccount(userParams.address);
        }

        let user: AppUserModel;
        if (!exists) {
            // create new user
            // including their phone number information, if it exists
            user = await models.appUser.create(
                userParams,
                userParams.trust?.phone
                    ? {
                          include: [
                              {
                                  model: models.appUserTrust,
                                  as: 'trust',
                              },
                          ],
                      }
                    : {}
            );
        } else {
            if (userParams.pushNotificationToken) {
                models.appUser.update(
                    {
                        pushNotificationToken: userParams.pushNotificationToken,
                    },
                    { where: { address: userParams.address } }
                );
            }
            // it's not null at this point
            user = (await models.appUser.findOne({
                where: { address: userParams.address },
                include: [
                    {
                        model: models.appUserTrust,
                        as: 'trust',
                    },
                ],
            }))!;
            // if the account doesn't have a phone number
            // but it's being provided now, add it
            // otherwise, verify if account phone number and
            // provided phone number are the same
            const jsonUser = user.toJSON();
            if (
                jsonUser.trust?.length === 0 &&
                userParams.trust &&
                userParams.trust.phone.length > 0
            ) {
                const trust = await models.appUserTrust.create(
                    userParams.trust
                );
                await models.appUserThroughTrust.create({
                    userAddress: user.address,
                    appUserTrustId: trust.id,
                });
            } else if (
                jsonUser.trust &&
                jsonUser.trust.length > 0 &&
                userParams.trust?.phone &&
                userParams.trust.phone !== jsonUser.trust![0].phone
            ) {
                throw new BaseError(
                    'DIFFERENT_PHONE',
                    'phone associated with account is different'
                );
            }
        }

        if (!user.active) {
            throw new BaseError('INACTIVE_USER', 'user is inactive');
        }

        if (user.deletedAt) {
            throw new BaseError(
                'DELETION_PROCESS',
                'account in deletion process'
            );
        }

        this._updateLastLogin(user.id);
        // generate access token for future interactions that require authentication
        const token = generateAccessToken(userParams.address, user.id);

        // do not return trust key
        const jsonUser = user.toJSON();
        delete jsonUser['trust'];
        return {
            ...jsonUser,
            ...(await this._userRoles(user.address)),
            token,
        };
    }

    public async get(address: string) {
        const user = await models.appUser.findOne({
            where: { address },
        });
        if (user === null) {
            throw new BaseError('USER_NOT_FOUND', 'user not found');
        }
        return {
            ...user.toJSON(),
            ...(await this._userRoles(user.toJSON().address)),
        };
    }

    public async update(user: AppUser): Promise<AppUser> {
        const updated = await models.appUser.update(user, {
            returning: true,
            where: { address: user.address },
        });
        if (updated[0] === 0) {
            throw new BaseError('UPDATE_FAILED', 'user was not updated!');
        }
        return updated[1][0];
    }

    public async delete(address: string): Promise<boolean> {
        const roles = await getUserRoles(address);

        if (roles.manager !== null && roles.manager.state === 0) {
            throw new BaseError(
                'MANAGER',
                "Active managers can't delete accounts"
            );
        }

        const updated = await models.appUser.update(
            {
                deletedAt: new Date(),
            },
            {
                where: {
                    address,
                },
                returning: true,
            }
        );

        if (updated[0] === 0) {
            throw new BaseError('UPDATE_FAILED', 'User was not updated');
        }
        return true;
    }

    private async _recoverAccount(address: string) {
        try {
            await models.appUser.update(
                {
                    deletedAt: null,
                },
                {
                    where: { address },
                }
            );
        } catch (error) {
            throw new BaseError('UNEXPECTED_ERROR', error.message);
        }
    }

    private async _overwriteUser(user: AppUserCreationAttributes) {
        try {
            const usersToInactive = await models.appUser.findAll({
                include: [
                    {
                        model: models.appUserTrust,
                        as: 'trust',
                        where: {
                            phone: user.trust?.phone,
                        },
                    },
                ],
                where: {
                    address: {
                        [Op.not]: user.address,
                    },
                },
            });

            const promises = usersToInactive.map((el) =>
                models.appUser.update(
                    {
                        active: false,
                    },
                    {
                        where: {
                            address: el.address,
                        },
                    }
                )
            );

            promises.push(
                models.appUser.update(
                    {
                        active: true,
                    },
                    {
                        where: {
                            address: user.address,
                        },
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
            raw: true,
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
    private async _existsAccountByPhone(
        phone: string,
        address: string
    ): Promise<boolean> {
        const query = `
            SELECT address
            FROM app_user_trust
            LEFT JOIN app_user_through_trust ON "appUserTrustId" = id
            LEFT JOIN "app_user" as "user" ON "user".address = "userAddress"
            WHERE phone = :phone and address != :address
            AND "user".active = TRUE`;

        const exists = await sequelize.query(query, {
            type: QueryTypes.SELECT,
            replacements: {
                address,
                phone,
            },
        });
        console.log(exists);

        return exists.length > 0;
    }

    private async _updateLastLogin(id: number): Promise<void> {
        const t = await sequelize.transaction();
        try {
            await models.appUser.update(
                {
                    lastLogin: new Date(),
                },
                {
                    where: { id },
                    transaction: t,
                }
            );

            await t.commit();
        } catch (error) {
            await t.rollback();
            Logger.warn(`Error to update last login: ${error}`);
        }
    }

    private async _userRoles(address: string) {
        return await getUserRoles(address);
    }
}
