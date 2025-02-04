import { AppUserModel } from '../database/models/app/appUser';
import { NotificationParams, NotificationType } from '../interfaces/app/appNotification';
import { models } from '../database';
import { client as prismic } from '../utils/prismic';
import localesConfig from '../utils/locale.json';
// it needs to be imported this way, or the initialize will fail
import { AppUser } from '../interfaces/app/appUser';
import { Logger } from './logger';
import { Transaction } from 'sequelize';
import admin, { ServiceAccount } from 'firebase-admin';
import config from '../config';

export async function sendNotification(
    users: AppUserModel[],
    type: NotificationType,
    isWallet: boolean = true,
    isWebApp: boolean = true,
    params: NotificationParams | NotificationParams[] | undefined = undefined,
    transaction: Transaction | undefined = undefined,
    transfer:
        | {
              amount: Number;
              asset: string;
          }
        | undefined = undefined
) {
    try {
        // registry notification
        await models.appNotification.bulkCreate(
            users.map((el, i) => ({
                userId: el.id,
                type,
                isWallet,
                isWebApp,
                params: params instanceof Array ? params[i] : params
            })),
            { transaction }
        );

        // filter users that have walletPNT
        users = users.filter(el => el.walletPNT);

        if (users.length === 0) {
            return;
        }

        // get only unique languages
        const languages = [...new Set(users.map(el => el.language))];

        // mount notification object with title and description from prismic and users by language
        const prismicNotifications: { [language: string]: { title: string; description: string; users: AppUser[] } } =
            {};

        const fetchNotificationsFromPrismic = async (language: string) => {
            const locale = localesConfig.find(({ shortCode }) => language === shortCode.toLowerCase())?.code;
            const defaultLocale = localesConfig.find(({ isDefault }) => isDefault)?.code;

            // get prismic document
            const response = await prismic.getAllByType('push_notifications_data', {
                lang: locale || defaultLocale
            });
            const { data } = response[0];
            const title = data[`type${type}title`];
            let description = data[`type${type}description`];

            if (type === NotificationType.TRANSACTION_RECEIVED && transfer) {
                const amountPlaceholder = '{{amount}}';
                const assetPlaceholder = '{{asset}}';

                description = description
                    .replace(amountPlaceholder, transfer.amount)
                    .replace(assetPlaceholder, transfer.asset);
            }

            prismicNotifications[language] = {
                title,
                description,
                users: users.filter(el => el.language === language)
            };
        };

        await Promise.all(languages.map(fetchNotificationsFromPrismic));

        // send notification by group of languages
        await Promise.all(
            Object.keys(prismicNotifications).map(async (key, i) => {
                const prismicData = prismicNotifications[key];
                return sendFirebasePushNotification(
                    prismicData.users.map(el => el.walletPNT!),
                    prismicData.title,
                    prismicData.description,
                    params && (params instanceof Array ? params[i] : params)
                );
            })
        );
    } catch (error) {
        Logger.error('Failed to add notification:', error);
    }
}

export async function sendFirebasePushNotification(
    tokens: string[],
    title: string,
    body: string,
    data: any = undefined
) {
    try {
        const batch = 500;
        for (let i = 0; ; i += batch) {
            const tokens_batch = tokens.slice(i, i + batch);
            const message = {
                data,
                notification: {
                    body,
                    title
                },
                tokens: tokens_batch
            };

            const result = await admin
                .messaging()
                .sendEachForMulticast(message, process.env.NODE_ENV === 'developement');

            Logger.info(JSON.stringify(result));

            if (i + batch > tokens.length) {
                break;
            }
        }
    } catch (error) {
        Logger.error('Push notification failed', error);
    }
}

export function initPushNotificationService() {
    try {
        let jsonConfig: ServiceAccount = {};

        try {
            jsonConfig = require('./firebase.json');
        } catch (error) {
            // recover config file
            const base64file = config.firebaseFileBase64;
            jsonConfig = JSON.parse(Buffer.from(base64file, 'base64').toString());
        }

        admin.initializeApp({
            credential: admin.credential.cert(jsonConfig)
        });

        Logger.info('🔔 Push notification service initialized');
    } catch (error) {
        Logger.error('Push notification service failed to initialize', error);
    }
}
