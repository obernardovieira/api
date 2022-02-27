import { celebrate, Joi } from 'celebrate';

class StoryValidator {
    add = celebrate({
        body: Joi.object({
            communityId: Joi.number(),
            message: Joi.string().optional(),
            storyMediaPath: Joi.string().optional(),
        }),
    });
}

export default StoryValidator;
