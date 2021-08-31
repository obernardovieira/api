import { User } from '@interfaces/app/user';
import { QueryTypes, Op } from 'sequelize';

import { models, sequelize } from '../../../database';

export async function verifyUserSuspectActivity(): Promise<void> {
    const query = `
        WITH active_users AS (
            SELECT 
            "user".address, 
            "trust".phone 
            FROM 
            "user" 
            LEFT OUTER JOIN app_user_through_trust AS "through_trust" ON "user".address = "through_trust"."userAddress" 
            LEFT OUTER JOIN app_user_trust AS "trust" ON "through_trust"."appUserTrustId" = "trust".id 
            WHERE 
            "user".active = true
        ), 
        suspect_phone AS (
            SELECT 
            phone, 
            count(phone) n 
            FROM 
            active_users 
            GROUP BY
            phone
        ) 
        UPDATE 
            "user" 
        SET 
            suspect = CASE WHEN suspect_phone.n > 1 THEN true ELSE false END 
        FROM 
            active_users, 
            suspect_phone 
        WHERE 
            "user".address = active_users.address 
            AND suspect_phone.phone = active_users.phone 
            AND suspect = CASE WHEN suspect_phone.n > 1 THEN false ELSE true END;`;

    await sequelize.query(query, {
        type: QueryTypes.UPDATE,
    });
}

export async function verifyDeletedAccounts(): Promise<void> {
    const t = await sequelize.transaction();
    try {
        const date = new Date();
        date.setDate(date.getDate() - 15);

        const users = await models.user.findAll({
            attributes: ['address'],
            where: {
                deletedAt: { [Op.lt]: date },
            },
            include: [
                {
                    model: models.appUserTrust,
                    as: 'trust',
                },
            ],
        });

        const addresses = users.map((el) => el.address);

        users.forEach((user: User) => {
            user.trust?.forEach(async (el) => {
                await models.appUserTrust.destroy({
                    where: {
                        id: el.id,
                    },
                    transaction: t,
                });
            });
        });

        await models.storyContent.destroy({
            where: {
                byAddress: { [Op.in]: addresses },
            },
            transaction: t,
        });

        await models.storyUserEngagement.destroy({
            where: {
                address: { [Op.in]: addresses },
            },
            transaction: t,
        });

        await models.user.destroy({
            where: {
                address: { [Op.in]: addresses },
            },
            transaction: t,
        });

        await t.commit();
    } catch (error) {
        await t.rollback();
        throw error;
    }
}
