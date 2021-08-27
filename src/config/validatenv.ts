import dotenv from 'dotenv';
import { bool, cleanEnv, num, port, str } from 'envalid';

if (process.env.NODE_ENV === 'development') {
    const envFound = dotenv.config();
    if (!envFound) {
        // This error should crash whole process

        throw new Error("⚠️  Couldn't find .env file  ⚠️");
    }
} else if (process.env.NODE_ENV === 'test') {
    const envFound = dotenv.config({ path: '.env.test' });
    if (!envFound) {
        // This error should crash whole process

        throw new Error("⚠️  Couldn't find .env file  ⚠️");
    }
}

function onlyOnTestEnv(testDefault: any) {
    return process.env.NODE_ENV === 'test' ? testDefault : undefined;
}

function validateEnv() {
    return cleanEnv(process.env, {
        NODE_ENV: str(),
        PORT: port({ devDefault: onlyOnTestEnv(5000) }),
        DATABASE_URL: str(),
        CHAIN_JSON_RPC_URL: str({ devDefault: onlyOnTestEnv('xyz') }),
        JWT_SECRET: str({ devDefault: onlyOnTestEnv('xyz') }),
        CUSD_CONTRACT_ADDRESS: str({ devDefault: onlyOnTestEnv('xyz') }),
        IMPACT_MARKET_CONTRACT_ADDRESS: str({
            devDefault: onlyOnTestEnv('xyz'),
        }),
        IMPACT_MARKET_CONTRACT_BLOCK: num({ devDefault: 0 }),
        ATTESTATION_PROXY_ADDRESS: str({ devDefault: onlyOnTestEnv('xyz') }),
        AWS_ACCESS_KEY_ID: str({ devDefault: onlyOnTestEnv('xyz') }),
        AWS_SECRET_ACCESS_KEY: str({ devDefault: onlyOnTestEnv('xyz') }),
        AWS_BUCKET_COMMUNITY: str({ devDefault: onlyOnTestEnv('xyz') }),
        AWS_BUCKET_STORY: str({ devDefault: onlyOnTestEnv('xyz') }),
        AWS_BUCKET_PROFILE: str({ devDefault: onlyOnTestEnv('xyz') }),
        AWS_BUCKET_TEMPORARY: str({ devDefault: onlyOnTestEnv('xyz') }),
        AWS_REGION: str({ devDefault: onlyOnTestEnv('xyz') }),
        CURRENCIES_API_BASE_URL: str({ devDefault: onlyOnTestEnv('xyz') }),
        CURRENCIES_API_KEY: str({ devDefault: onlyOnTestEnv('xyz') }),
        POSITION_STACK_API_BASE_URL: str({ devDefault: 'xyz' }),
        POSITION_STACK_API_KEY: str({ devDefault: 'xyz' }),
        CLAIM_VERIFICATION: bool({ default: false }),
        MASTER_KEY: str({ devDefault: onlyOnTestEnv('xyz') }),
        LATEST_MOBILE_APP_VERSION: str({ devDefault: onlyOnTestEnv('0.0.0') }),
        MINIMAL_MOBILE_APP_VERSION: str({ devDefault: onlyOnTestEnv('0.0.1') }),
        LOG_LEVEL: str({ default: 'warn' }),
        FLEEK_STORAGE_KEY_ID: str({ devDefault: onlyOnTestEnv('xyz') }),
        FLEEK_STORAGE_ACCESS_KEY: str({ devDefault: onlyOnTestEnv('xyz') }),
        COMMUNITY_PLACEHOLDER_IMAGE_URL: str({
            devDefault: onlyOnTestEnv('xyz'),
        }),
        API_ENVIRONMENT: str({
            choices: ['development', 'test', 'production', 'staging'],
            devDefault: 'test',
        }),
        CLOUDFRONT_URL: str({ devDefault: onlyOnTestEnv('xyz') }),
        SENTRY_KEY: str({ default: '' }),
        SENTRY_TRACE_SAMPLES_RATE: num({ default: 0 }),
        ADMIN_KEY: str({ devDefault: onlyOnTestEnv('xyz') }),
        HASH_KEY: str({ devDefault: onlyOnTestEnv('xyz') }),
        REDIS_URL: str({ devDefault: 'redis://localhost:6379' }),
        BULL_JOBS_CONCURRENCY: num({ devDefault: 2 }),
        IMPACTMARKET_STORY_COVER_ID: num({ devDefault: onlyOnTestEnv(0) }),
        STORY_CRON_ACTIVE: bool({ default: false }),
        SLACK_API: str({ default: 'xyz' }),
        SENDGRID_API_KEY: str({ default: 'xyz' }),
        INTERNAL_EMAIL_NOTIFYING: str({ default: 'none@none.none' }),
        INTERNAL_EMAIL_TO_NOTIFY: str({ default: 'none@none.none' }),
        HAS_REDIS_TLS: bool({ default: true }),
        INTERNAL_NOTIFICATIONS: bool({ default: false }),
        MAX_REQUEST_PER_USER: num({ default: 900 }),
        PBKDF2_SALT: str({ devDefault: onlyOnTestEnv('salt') }),
    });
}

export default validateEnv;
