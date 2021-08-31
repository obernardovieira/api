import UserController from '@controllers/user';
import userValidators from '@validators/user';
import { Router } from 'express';

import { authenticateToken } from '../middlewares';

export default (app: Router): void => {
    const route = Router();
    const userController = new UserController();

    app.use('/user', route);

    /**
     * @deprecated
     */
    route.post(
        '/authenticate',
        userValidators.auth,
        userController.authenticate
    );

    /**
     * @deprecated
     */
    route.post(
        '/hello',
        authenticateToken,
        userValidators.welcome,
        userController.hello
    );

    /**
     * @deprecated
     */
    route.get('/exists/:address', userController.userExists);

    /**
     * @swagger
     *
     * /user/auth:
     *   post:
     *     tags:
     *     - "user"
     *     summary: "Authenticate user"
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               address:
     *                 type: string
     *                 required: true
     *               phone:
     *                 type: string
     *                 description: phone number (hashed once it reaches the backend)
     *                 required: true
     *               language:
     *                 type: string
     *                 required: false
     *               currency:
     *                 type: string
     *                 required: false
     *               pushNotificationToken:
     *                 type: string
     *                 required: false
     *               username:
     *                 type: string
     *                 required: false
     *               gender:
     *                 type: string
     *                 enum: [u, m, f, o]
     *                 required: false
     *               year:
     *                 type: number
     *                 required: false
     *               children:
     *                 type: number
     *                 required: false
     *               avatarMediaId:
     *                 type: number
     *                 required: false
     *     responses:
     *       "200":
     *         description: "Success"
     *       "403":
     *         description: "Invalid input"
     */
    route.post('/auth', userValidators.auth, userController.auth);

    route.get(
        '/media/:mime',
        authenticateToken,
        userController.getPresignedUrlMedia
    );

    route.put('/avatar', authenticateToken, userController.updateAvatar);

    route.post(
        '/welcome',
        authenticateToken,
        userValidators.welcome,
        userController.welcome
    );

    route.post(
        '/report',
        authenticateToken,
        userValidators.report,
        userController.report
    );

    route.get('/exist/:address', userController.userExist);

    /**
     * @deprecated Last used in 1.1.12
     */
    route.post(
        '/username',
        authenticateToken,
        userValidators.updateUsername,
        userController.updateUsername
    );

    /**
     * @deprecated Last used in 1.1.12
     */
    route.post(
        '/currency',
        authenticateToken,
        userValidators.updateCurrency,
        userController.updateCurrency
    );

    /**
     * @deprecated Last used in 1.1.12
     */
    route.post(
        '/push-notifications',
        authenticateToken,
        userValidators.updatePushNotificationsToken,
        userController.updatePushNotificationsToken
    );

    /**
     * @deprecated Last used in 1.1.12
     */
    route.post(
        '/language',
        authenticateToken,
        userValidators.updateLanguage,
        userController.updateLanguage
    );

    /**
     * @deprecated Last used in 1.1.12
     */
    route.post(
        '/gender',
        authenticateToken,
        userValidators.updateGender,
        userController.updateGender
    );

    /**
     * @deprecated Last used in 1.1.12
     */
    route.post(
        '/age',
        authenticateToken,
        userValidators.updateAge,
        userController.updateAge
    );

    /**
     * @deprecated Last used in 1.1.12
     */
    route.post(
        '/children',
        authenticateToken,
        userValidators.updateChildren,
        userController.updateChildren
    );

    route.post(
        '/device',
        authenticateToken,
        userValidators.device,
        userController.device
    );

    /**
     * @swagger
     *
     * /user:
     *   put:
     *     tags:
     *       - "user"
     *     summary: Edit existing user
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               language:
     *                 type: string
     *                 required: false
     *               currency:
     *                 type: string
     *                 required: false
     *               pushNotificationToken:
     *                 type: string
     *                 required: false
     *               username:
     *                 type: string
     *                 required: false
     *               gender:
     *                 type: string
     *                 enum: [u, m, f, o]
     *                 required: false
     *               year:
     *                 type: number
     *                 required: false
     *               children:
     *                 type: number
     *                 required: false
     *               avatarMediaId:
     *                 type: number
     *                 required: false
     *     responses:
     *       "200":
     *          description: OK
     *          content:
     *            application/json:
     *              schema:
     *                type: object
     *                properties:
     *                  success:
     *                    type: boolean
     *                  user:
     *                    $ref: '#/components/schemas/AppUser'
     *     security:
     *     - api_auth:
     *       - "write:modify":
     */
    route.put('/', authenticateToken, userValidators.edit, userController.edit);

    /**
     * @swagger
     *
     * /user:
     *   delete:
     *     tags:
     *       - "user"
     *     summary: Delete a user
     *     responses:
     *       "200":
     *         description: OK
     *     security:
     *     - api_auth:
     *       - "write:modify":
     */
    route.delete('/', authenticateToken, userController.delete);
};
