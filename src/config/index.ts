import validateEnv from './validatenv';

const validatedEnv = validateEnv();

export default {
    /**
     * Your favorite port
     */
    port: validatedEnv.PORT,

    /**
     * Database access config
     */
    dbUrl: validatedEnv.DATABASE_URL,

    /**
     * json rpc url
     */
    jsonRpcUrl: validatedEnv.CHAIN_JSON_RPC_URL,

    /**
     * Your secret sauce
     */
    jwtSecret: validatedEnv.JWT_SECRET,

    /**
     * Used by winston logger
     */
    logs: {
        level: validatedEnv.LOG_LEVEL,
    },

    /**
     * API configs
     */
    api: {
        prefix: '/api',
    },

    /**
     * Address to the attestation proxy contract
     */
    attestationProxyAddress: validatedEnv.ATTESTATION_PROXY_ADDRESS,

    /**
     * Contract Address to use in dev
     */
    cUSDContractAddress: validatedEnv.CUSD_CONTRACT_ADDRESS,

    /**
     * Contract Address to use in dev
     */
    impactMarketContractAddress: validatedEnv.IMPACT_MARKET_CONTRACT_ADDRESS,

    /**
     * Contract Address to use in dev
     */
    impactMarketContractBlockNumber: validatedEnv.IMPACT_MARKET_CONTRACT_BLOCK,

    /**
     * Decimals in cUSD token
     */
    cUSDDecimal: 18,

    /**
     * Fixer API to get currency rates.
     */
    currenciesApiBaseUrl: validatedEnv.CURRENCIES_API_BASE_URL,

    /**
     * Fixer API to get currency rates.
     */
    currenciesApiKey: validatedEnv.CURRENCIES_API_KEY,

    /**
     * Sentry key.
     */
    sentryKey: validatedEnv.SENTRY_KEY,

    /**
     * Master internal key.
     */
    masterKey: validatedEnv.MASTER_KEY,

    /**
     * AWS config.
     */
    aws: {
        accessKeyId: validatedEnv.AWS_ACCESS_KEY_ID,
        secretAccessKey: validatedEnv.AWS_SECRET_ACCESS_KEY,
        region: validatedEnv.AWS_REGION,
        bucket: {
            community: validatedEnv.AWS_BUCKET_COMMUNITY,
            story: validatedEnv.AWS_BUCKET_STORY,
            profile: validatedEnv.AWS_BUCKET_PROFILE,
            temporary: validatedEnv.AWS_BUCKET_TEMPORARY,
        },
    },

    /**
     * Fleek Storage config.
     */
    fleekStorage: {
        accessKeyId: validatedEnv.FLEEK_STORAGE_KEY_ID,
        secretAccessKey: validatedEnv.FLEEK_STORAGE_ACCESS_KEY,
    },

    /**
     * Mobile versions.
     */
    mobileVersion: {
        latest: validatedEnv.LATEST_MOBILE_APP_VERSION,
        minimal: validatedEnv.MINIMAL_MOBILE_APP_VERSION,
    },

    /**
     * Placeholder image to use meanwhile community creation.
     */
    communityPlaceholderImageUrl: validatedEnv.COMMUNITY_PLACEHOLDER_IMAGE_URL,

    /**
     * Cloudfront URL to be useed
     */
    cloudfrontUrl: validatedEnv.CLOUDFRONT_URL,

    /**
     * tracesSampleRate used in sentry.
     */
    tracesSampleRate: validatedEnv.SENTRY_TRACE_SAMPLES_RATE,

    /**
     * Key used to hash
     */
    hashKey: validatedEnv.HASH_KEY,

    /**
     *
     */
    adminKey: validatedEnv.ADMIN_KEY,

    /**
     * Thumbnails size for media content
     * 0 (zero) is for auto
     */
    thumbnails: {
        story: [
            {
                width: 94,
                height: 148,
            },
            {
                width: 84,
                height: 140,
            },
        ],
        community: {
            cover: [
                {
                    width: 392,
                    height: 392,
                },
                {
                    width: 293,
                    height: 293,
                },
                {
                    width: 88,
                    height: 88,
                },
                {
                    width: 330,
                    height: 330,
                },
                {
                    width: 42,
                    height: 42,
                },
                {
                    width: 294,
                    height: 294,
                },
            ],
        },
        promoter: {
            logo: [
                {
                    width: 100,
                    height: 100,
                },
            ],
        },
        profile: [
            {
                width: 42,
                height: 42,
            },
            {
                width: 80,
                height: 80,
            },
        ],
        pixelRatio: [1, 2],
    },

    redis: validatedEnv.REDIS_URL,

    bullJobsConcurrency: validatedEnv.SENTRY_TRACE_SAMPLES_RATE,

    impactMarketStoryCoverId: validatedEnv.IMPACTMARKET_STORY_COVER_ID,

    positionStackApiBaseUrl: validatedEnv.POSITION_STACK_API_BASE_URL,
    positionStackApiKey: validatedEnv.POSITION_STACK_API_KEY,
    claimVerification: validatedEnv.CLAIM_VERIFICATION,
    storyCronActive: validatedEnv.STORY_CRON_ACTIVE,
    slackApi: validatedEnv.SLACK_API,
    sendgridApi: validatedEnv.SENDGRID_API_KEY,
    internalEmailNotifying: validatedEnv.INTERNAL_EMAIL_NOTIFYING,
    internalEmailToNotify: validatedEnv.INTERNAL_EMAIL_TO_NOTIFY,

    hasRedisTls: validatedEnv.HAS_REDIS_TLS,

    internalNotifications: validatedEnv.INTERNAL_NOTIFICATIONS,

    maxRequestPerUser: validatedEnv.MAX_REQUEST_PER_USER,

    pbkdf2Salt: validatedEnv.PBKDF2_SALT,
};
