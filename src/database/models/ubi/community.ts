import { AppMediaContent } from '@interfaces/app/appMediaContent';
import { StoryCommunity } from '@interfaces/story/storyCommunity';
import { UbiClaimLocation } from '@interfaces/ubi/ubiClaimLocation';
import { UbiCommunityContract } from '@interfaces/ubi/ubiCommunityContract';
import { UbiCommunityDailyMetrics } from '@interfaces/ubi/ubiCommunityDailyMetrics';
import { UbiCommunityDailyState } from '@interfaces/ubi/ubiCommunityDailyState';
import { UbiCommunityDemographics } from '@interfaces/ubi/ubiCommunityDemographics';
import { UbiCommunityState } from '@interfaces/ubi/ubiCommunityState';
import { UbiCommunitySuspect } from '@interfaces/ubi/ubiCommunitySuspect';
// import { UbiPromoter } from '@interfaces/ubi/ubiPromoter';
import { Sequelize, DataTypes, Model } from 'sequelize';

import { BeneficiaryAttributes } from './beneficiary';

export interface CommunityAttributes {
    id: number; // Note that the `null assertion` `!` is required in strict mode.
    publicId: string; // TODO: to be removed
    requestByAddress: string;
    contractAddress: string | null;
    name: string;
    description: string;
    descriptionEn: string | null;
    language: string;
    currency: string;
    city: string;
    country: string;
    gps: {
        latitude: number;
        longitude: number;
    };
    email: string;
    visibility: 'public' | 'private';
    coverImage: string; // TODO: to be removed
    coverMediaId: number;
    status: 'pending' | 'valid' | 'removed'; // pending / valid / removed
    review: 'pending' | 'in-progress' | 'halted' | 'closed';
    started: Date; // TODO: to be removed

    // timestamps
    createdAt: Date;
    updatedAt: Date;

    metrics?: UbiCommunityDailyMetrics[]; // TODO: to be removed
    cover?: AppMediaContent;
    contract?: UbiCommunityContract; // TODO: to be removed
    state?: UbiCommunityState; // TODO: to be removed
    storyCommunity?: StoryCommunity[]; // TODO: to be removed
    suspect?: UbiCommunitySuspect[]; // TODO: to be removed
    beneficiaries?: BeneficiaryAttributes[]; // TODO: to be removed
    // promoter?: UbiPromoter;
    claimLocation?: UbiClaimLocation[]; // TODO: to be removed
    demographics?: UbiCommunityDemographics[]; // TODO: to be removed
    dailyState?: UbiCommunityDailyState[]; // TODO: to be removed
}
export interface CommunityCreationAttributes {
    requestByAddress: string;
    contractAddress?: string;
    name: string;
    description: string;
    descriptionEn?: string;
    language: string;
    currency: string;
    city: string;
    country: string;
    gps: {
        latitude: number;
        longitude: number;
    };
    email: string;
    visibility: 'public' | 'private';
    coverImage?: string; // TODO: will be required once next version is released
    coverMediaId?: number; // TODO: will be required once next version is released
    status: 'pending' | 'valid' | 'removed'; // pending / valid / removed
    started: Date;
}

export class Community extends Model<
    CommunityAttributes,
    CommunityCreationAttributes
> {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public publicId!: string;
    public requestByAddress!: string;
    public contractAddress!: string | null;
    public name!: string;
    public description!: string;
    public descriptionEn!: string | null;
    public language!: string;
    public currency!: string;
    public city!: string;
    public country!: string;
    public gps!: {
        latitude: number;
        longitude: number;
    };
    public email!: string;
    public visibility!: 'public' | 'private';
    public coverImage!: string;
    public coverMediaId!: number | null; // TODO: will be required once next version is released
    public status!: 'pending' | 'valid' | 'removed'; // pending / valid / removed
    public review!: 'pending' | 'in-progress' | 'halted' | 'closed';
    public started!: Date;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export function initializeCommunity(sequelize: Sequelize): void {
    Community.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            publicId: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                unique: true,
                allowNull: false,
            },
            requestByAddress: {
                type: DataTypes.STRING(44),
                unique: true,
                allowNull: false,
            },
            contractAddress: {
                type: DataTypes.STRING(44),
            },
            name: {
                type: DataTypes.STRING(64),
                allowNull: false,
            },
            description: {
                type: DataTypes.STRING(1024),
                allowNull: false,
            },
            descriptionEn: {
                type: DataTypes.STRING(1024),
                allowNull: true,
            },
            language: {
                type: DataTypes.STRING(8),
                defaultValue: 'en',
                allowNull: false,
            },
            currency: {
                type: DataTypes.STRING(4),
                defaultValue: 'USD',
                allowNull: false,
            },
            city: {
                type: DataTypes.STRING(64),
                allowNull: false,
            },
            country: {
                type: DataTypes.STRING(64),
                allowNull: false,
            },
            gps: {
                type: DataTypes.JSON,
                allowNull: false,
            },
            email: {
                type: DataTypes.STRING(64),
                allowNull: false,
            },
            visibility: {
                type: DataTypes.ENUM('public', 'private'),
                allowNull: false,
            },
            coverImage: {
                type: DataTypes.STRING(128),
                allowNull: true,
            },
            coverMediaId: {
                type: DataTypes.INTEGER,
                references: {
                    model: 'app_media_content',
                    key: 'id',
                },
                // onDelete: 'SET NULL', // default
                allowNull: true, // TODO: will be required once next version is released
            },
            status: {
                type: DataTypes.ENUM('pending', 'valid', 'removed'),
                allowNull: false,
            },
            review: {
                type: DataTypes.ENUM(
                    'pending',
                    'in-progress',
                    'halted',
                    'closed'
                ),
                defaultValue: 'pending',
                allowNull: false,
            },
            started: {
                type: DataTypes.DATEONLY,
                allowNull: false,
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
        },
        {
            tableName: 'community',
            sequelize,
        }
    );
}
