import { Joi } from 'celebrate';

import { ContainerTypes, ValidatedRequestSchema, createValidator } from '../utils/queryValidator';
import { defaultSchema } from './defaultSchema';
import config from '~config/index';

const validator = createValidator();

type ListCICOProviderType = {
    country?: string;
    lat?: number;
    lng?: number;
    distance?: number;
    type?: number;
    limit: number;
    offset: number;
};

const queryListBorrowersSchema = defaultSchema.object<ListCICOProviderType>({
    country: Joi.string().optional(),
    lat: Joi.number().optional(),
    lng: Joi.number().optional(),
    distance: Joi.number().optional(),
    type: Joi.number().optional(),
    limit: Joi.number().optional().default(config.defaultLimit),
    offset: Joi.number().optional().default(config.defaultOffset)
});

interface ListCICOProviderRequestSchema extends ValidatedRequestSchema {
    [ContainerTypes.Query]: ListCICOProviderType;
}

const listCICOProviderValidator = validator.query(queryListBorrowersSchema);

export { listCICOProviderValidator, ListCICOProviderRequestSchema };
