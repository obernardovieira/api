import { ethers } from 'ethers';
import faker from 'faker';

import { AppUserTrustModel } from '../../src/database/models/app/appUserTrust';
import { UserModel } from '../../src/database/models/app/user';
import { User, UserCreationAttributes } from '../../src/interfaces/app/user';

interface ICreateProps {
    phone?: string;
    suspect?: boolean;
    active?: boolean;
    gender?: string;
    year?: number;
}
/**
 * Generate an object which container attributes needed
 * to successfully create a user instance.
 *
 * @param  {Object} props Properties to use for the user.
 *
 * @return {Object}       An object to build the user from.
 */
const data = async (props?: ICreateProps) => {
    const randomWallet = ethers.Wallet.createRandom();
    const defaultProps: UserCreationAttributes = {
        address: await randomWallet.getAddress(),
        username: faker.internet.userName(),
        language: 'pt',
        currency: faker.finance.currencyCode(),
        gender: props?.gender ? props?.gender : 'u',
        pushNotificationToken: '',
        suspect: props?.suspect ? props.suspect : false,
        trust: {
            phone: props?.phone ? props.phone : faker.phone.phoneNumber(),
        },
        active: props?.active,
        year: props?.year,
    };
    return defaultProps;
};
/**
 * Generates a user instance from the properties provided.
 *
 * @param  {Object} props Properties to use for the user.
 *
 * @return {Object}       A user instance
 */
const UserFactory = async (
    options: { n: number; props?: ICreateProps[] } = { n: 1 }
) => {
    const result: User[] = [];
    for (let index = 0; index < options.n; index++) {
        const newUser: UserModel = await UserModel.create(
            await data(options.props ? options.props[index] : undefined),
            {
                include: [
                    {
                        model: AppUserTrustModel,
                        as: 'trust',
                    },
                ],
            } as any
        ); // use any :facepalm:
        result.push(newUser.toJSON() as User);
    }
    return result;
};
export default UserFactory;
