
// API to app

export interface ICommunity {
    publicId: string;
    requestByAddress: string;
    contractAddress: string;
    name: string;
    description: string;
    country: string;
    city: string;
    gps: {
        latitude: number;
        longitude: number;
    };
    visibility: string;
    email: string;
    coverImage: string;
    status: string;
    txCreationObj: ICommunityVars;
    createdAt: string;
    updatedAt: string;
}

export interface ICommunityInfo extends ICommunity {
    backers: string[];
    beneficiaries: {
        added: ICommunityInfoBeneficiary[];
        removed: ICommunityInfoBeneficiary[];
    };
    managers: string[];
    ssi: {
        dates: Date[],
        values: number[],
    };
    totalClaimed: string;
    totalRaised: string;
    vars: ICommunityVars;
}

export interface ICommunityVars {
    _claimAmount: string;
    _baseInterval: string;
    _incrementInterval: string;
    _maxClaim: string;
}

export interface ICommunityInfoBeneficiary {
    address: string;
    name: string;
    claimed: string;
}

export interface IAddressAndName {
    address: string;
    name: string;
}

export interface IUser {
    address: string;
    username: string | null;
    currency: string | null;
    avatar: string;
    language: number;
}

export interface IUserWelcome {
    user: IUser; // TODO: remove in the future, as it's intended to be on memory
    exchangeRates: object; // TODO: this is not really an object
    isBeneficiary: boolean;
    isManager: boolean;
    community?: ICommunityInfo;
}

/**
 * @deprecated
 */
export interface IRecentTxAPI {
    picture: string;
    from: IAddressAndName;
    value: string;
    timestamp: number;
}

/**
 * @deprecated
 */
export interface IPaymentsTxAPI {
    picture: string;
    to: IAddressAndName;
    value: string;
    timestamp: number;
}

export interface IUserTxAPI {
    picture: string;
    to: IAddressAndName;
    value: string;
    timestamp: number;
}

export enum AgendaAction {
    notification = 'notification'
}