import { celebrate, Joi } from 'celebrate';

const report = celebrate({
    body: Joi.object({
        communityId: Joi.any().required(),
        message: Joi.string().required().allow(''), // TODO: temporary, fixed in mobile-app@1.0.7
    }),
});

const auth = celebrate({
    body: Joi.object({
        address: Joi.string().required(),
        phone: Joi.string().required(),
        language: Joi.string().optional(),
        currency: Joi.string().optional(),
        pushNotificationToken: Joi.string().optional().allow(''),
        username: Joi.string().optional(),
        gender: Joi.string().optional(),
        year: Joi.number().optional(),
        children: Joi.number().optional(),
        avatarMediaId: Joi.number().optional(),
        overwrite: Joi.boolean().optional(),
    }),
});

const welcome = celebrate({
    body: Joi.object({
        address: Joi.string().optional(), // TODO: deprecated in mobile@1.1.5
        token: Joi.string().allow(''), // TODO: deprecated in mobile@1.1.5
        phone: Joi.string().optional(), // TODO: deprecated in mobile@1.1.5
        pushNotificationToken: Joi.string().optional(), // TODO: required in mobile@1.1.5
    }),
});

const updateUsername = celebrate({
    body: Joi.object({
        address: Joi.string().optional(), // TODO: remove it once 1.0.7 is the minimal mobile version!
        username: Joi.string().required().allow(''),
    }),
});

const updateCurrency = celebrate({
    body: Joi.object({
        address: Joi.string().optional(), // TODO: remove it once 1.0.7 is the minimal mobile version!
        currency: Joi.string().required(),
    }),
});

const updatePushNotificationsToken = celebrate({
    body: Joi.object({
        address: Joi.string().optional(), // TODO: remove it once 1.0.7 is the minimal mobile version!
        token: Joi.string().required(),
    }),
});

const updateLanguage = celebrate({
    body: Joi.object({
        address: Joi.string().optional(), // TODO: remove it once 1.0.7 is the minimal mobile version!
        language: Joi.string().required(),
    }),
});

const updateGender = celebrate({
    body: Joi.object({
        address: Joi.string().optional(), // TODO: remove it once 1.0.7 is the minimal mobile version!
        gender: Joi.string().required().allow(''),
    }),
});

const updateAge = celebrate({
    body: Joi.object({
        address: Joi.string().optional(), // TODO: remove it once 1.0.7 is the minimal mobile version!
        age: Joi.number().required().allow(null),
    }),
});

const updateChildren = celebrate({
    body: Joi.object({
        address: Joi.string().optional(), // TODO: remove it once 1.0.7 is the minimal mobile version!
        children: Joi.number().required().allow(null),
    }),
});

const device = celebrate({
    body: Joi.object({
        phone: Joi.string().required(),
        identifier: Joi.string().required(),
        device: Joi.string().required(),
        network: Joi.string().required().allow(''),
    }),
});

const edit = celebrate({
    body: Joi.object({
        language: Joi.string().optional(),
        currency: Joi.string().optional(),
        username: Joi.string().optional(),
        gender: Joi.string().optional(),
        year: Joi.number().optional(),
        children: Joi.number().optional(),
        avatarMediaId: Joi.number().optional(),
        pushNotificationToken: Joi.string().optional().allow(''),
    }),
});

export default {
    report,
    auth,
    welcome,
    updateUsername,
    updateCurrency,
    updatePushNotificationsToken,
    updateLanguage,
    updateGender,
    updateAge,
    updateChildren,
    device,
    edit,
};
