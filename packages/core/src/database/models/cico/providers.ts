import { DataTypes, Model, Sequelize } from 'sequelize';

type ExchangeDetails = {
    fee: number;
    min?: number;
    max?: number;
    logoUrl?: string;
    website?: string;
    customImplementation?: string;
    iframeUrl?: string;
};

type MerchantDetails = {
    category: number;
    fee: number;
    min?: number;
    max?: number;
    // it's maps address, not wallet address
    address: string;
    phone: string;
    gps: {
        latitude: number;
        longitude: number;
    };
    payment: boolean;
};

type IndividualDetails = {
    category: number;
    fee: number;
    min?: number;
    max?: number;
    phone: string;
};

type FiatConnectDetails = {};

export interface CICOProviderRegistry {
    id: number;
    name: string;
    description: string;
    countries: string[];
    type: number;
    isCashin: boolean;
    isCashout: boolean;
    details: ExchangeDetails | MerchantDetails | IndividualDetails | FiatConnectDetails;

    updatedAt: Date;
}

export interface CICOProviderRegistryCreation {
    name: string;
    description: string;
    countries: string[];
    type: number;
    isCashin: boolean;
    isCashout: boolean;
    details: ExchangeDetails | MerchantDetails | IndividualDetails;
}

export class AppCICOProviderModel extends Model<CICOProviderRegistry, CICOProviderRegistryCreation> {
    public id!: number;
    public name!: string;
    public description!: string;
    public countries!: string[];
    // 0 - exchange, 1 - merchant, 2 - individual
    public type!: number;
    public isCashin!: boolean;
    public isCashout!: boolean;
    public details!: ExchangeDetails | MerchantDetails | IndividualDetails;

    // timestamps!
    public updatedAt!: Date;
}

export function initializeAppCICOProvider(sequelize: Sequelize): typeof AppCICOProviderModel {
    AppCICOProviderModel.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            name: {
                type: DataTypes.STRING(64),
                allowNull: false
            },
            description: {
                type: DataTypes.STRING(256),
                allowNull: false
            },
            countries: {
                type: DataTypes.ARRAY(DataTypes.STRING(2)),
                allowNull: false
            },
            type: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            isCashin: {
                type: DataTypes.BOOLEAN,
                allowNull: false
            },
            isCashout: {
                type: DataTypes.BOOLEAN,
                allowNull: false
            },
            details: {
                type: DataTypes.JSONB,
                allowNull: false
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false
            }
        },
        {
            tableName: 'app_cico_provider',
            modelName: 'appCICOProvider',
            sequelize,
            createdAt: false
        }
    );
    return AppCICOProviderModel;
}
