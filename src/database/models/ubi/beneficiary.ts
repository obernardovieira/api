import { User } from '@interfaces/app/user';
import { Sequelize, DataTypes, Model } from 'sequelize';

import { CommunityAttributes } from './community';

export interface BeneficiaryAttributes {
    id: number;
    address: string;
    communityId: string;
    active: boolean;
    blocked: boolean;
    tx: string;
    txAt: Date;
    claims: number;
    claimed: string;
    lastClaimAt: Date | null;
    penultimateClaimAt: Date | null;

    // timestamps
    createdAt: Date;
    updatedAt: Date;

    user?: User;
    community?: CommunityAttributes;
}
export interface BeneficiaryCreationAttributes {
    address: string;
    communityId: string;
    tx: string;
    txAt: Date;
}

export class Beneficiary extends Model<
    BeneficiaryAttributes,
    BeneficiaryCreationAttributes
> {
    public id!: number;
    public address!: string;
    public communityId!: string;
    public active!: boolean;
    public blocked!: boolean;
    public tx!: string;
    public txAt!: Date;
    public claims!: number;
    public claimed!: string;
    public lastClaimAt!: Date | null;
    public penultimateClaimAt!: Date | null;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export function initializeBeneficiary(sequelize: Sequelize): void {
    Beneficiary.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            address: {
                type: DataTypes.STRING(44),
                // references: {
                //     model: 'user',
                //     key: 'address',
                // },
                // onDelete: 'RESTRICT', // delete only if active = false, separately
                allowNull: false,
            },
            communityId: {
                type: DataTypes.UUID,
                references: {
                    model: 'community',
                    key: 'publicId',
                },
                onDelete: 'RESTRICT',
                allowNull: false,
            },
            active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },
            blocked: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
            tx: {
                type: DataTypes.STRING(68),
                unique: true,
                allowNull: false,
            },
            txAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            claims: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
            claimed: {
                type: DataTypes.DECIMAL(22), // max 9,999 - plus 18 decimals
                defaultValue: 0,
            },
            lastClaimAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            penultimateClaimAt: {
                type: DataTypes.DATE,
                allowNull: true,
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
            tableName: 'beneficiary',
            sequelize,
        }
    );
}
