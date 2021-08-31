import { BeneficiaryAttributes } from '@models/ubi/beneficiary';
import { ManagerAttributes } from '@models/ubi/manager';

import { AppMediaContent } from './appMediaContent';
import { AppUserTrust, AppUserTrustCreation } from './appUserTrust';

/**
 * @swagger
 *  components:
 *    schemas:
 *      AppUser:
 *        type: object
 *        required:
 *          - address
 *          - username
 *          - language
 *          - currency
 *          - pushNotificationToken
 *          - gender
 *          - year
 *          - children
 *          - lastLogin
 *          - suspect
 *          - createdAt
 *          - updatedAt
 *          - avatar
 *        properties:
 *          address:
 *            type: string
 *            description: User address
 *          username:
 *            type: string
 *            nullable: true
 *            description: User name (optional)
 *          language:
 *            type: string
 *            description: User language, used in the app
 *          currency:
 *            type: string
 *            description: User currency, used in the app
 *          pushNotificationToken:
 *            type: string
 *            description: User push notifications token, used in the app
 *          gender:
 *            type: string
 *            enum: [u, m, f, o]
 *            description: User gender (optional)
 *          year:
 *            type: integer
 *            description: User year born (optional)
 *          children:
 *            type: integer
 *            description: User n children (optional)
 *          lastLogin:
 *            type: date
 *            description: User last login
 *          suspect:
 *            type: boolean
 *            description: True if user is suspect, set by internal mechanism
 *          createdAt:
 *            type: date
 *            description: Manager date of submission
 *          updatedAt:
 *            type: date
 *            description: Manager date of last update
 *          avatar:
 *            $ref: '#/components/schemas/AppMediaContent'
 */
export interface User {
    address: string;
    avatarMediaId: number | null;
    username: string | null;
    language: string;
    currency: string;
    pushNotificationToken: string | null;
    gender: string;
    year: number | null;
    children: number | null;
    lastLogin: Date;
    suspect: boolean;
    active: boolean;

    // timestamps
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;

    avatar?: AppMediaContent;
    trust?: AppUserTrust[];
    beneficiary?: BeneficiaryAttributes[];
    manager?: ManagerAttributes[];
}

export interface UserCreationAttributes {
    address: string;
    language?: string;
    currency?: string;
    suspect?: boolean; // for test purposes
    username?: string;
    gender?: string;
    year?: number;
    children?: number;
    avatarMediaId?: number;
    pushNotificationToken?: string;
    active?: boolean;

    trust?: AppUserTrustCreation;
}
