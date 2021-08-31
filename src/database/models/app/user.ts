import { User, UserCreationAttributes } from '@interfaces/app/user';
import { Sequelize, DataTypes, Model } from 'sequelize';

export class UserModel extends Model<User, UserCreationAttributes> {
    public address!: string;
    public username!: string | null;
    public avatarMediaId!: number | null;
    public language!: string;
    public currency!: string;
    public pushNotificationToken!: string | null;
    public gender!: string;
    public year!: number | null;
    public children!: number | null;
    public lastLogin!: Date;
    public suspect!: boolean;
    public active!: boolean;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date;
}

export function initializeUser(sequelize: Sequelize): typeof UserModel {
    UserModel.init(
        {
            address: {
                type: DataTypes.STRING(44),
                allowNull: false,
                primaryKey: true,
                unique: true,
            },
            avatarMediaId: {
                type: DataTypes.INTEGER,
                references: {
                    model: 'app_media_content',
                    key: 'id',
                },
                // onDelete: 'SET NULL', // default
                allowNull: true,
            },
            username: {
                type: DataTypes.STRING(128),
            },
            language: {
                type: DataTypes.STRING(8),
                defaultValue: 'en',
                allowNull: false,
            },
            currency: {
                type: DataTypes.STRING(4),
            },
            pushNotificationToken: {
                type: DataTypes.STRING(64),
            },
            gender: {
                type: DataTypes.STRING(2),
                defaultValue: 'u',
            },
            year: {
                type: DataTypes.INTEGER,
            },
            children: {
                type: DataTypes.INTEGER,
            },
            lastLogin: {
                type: DataTypes.DATE,
                defaultValue: Sequelize.fn('now'),
                allowNull: false,
            },
            suspect: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            },
            active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
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
            deletedAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            tableName: 'user',
            sequelize,
        }
    );
    return UserModel;
}
