require('dotenv').config();

const num = (v, d) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v));

module.exports = {
  port: num(process.env.PORT, 5000),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/campusgigs',
  dbSsl: String(process.env.DB_SSL).toLowerCase() === 'true',
  jwtSecret: process.env.JWT_SECRET || 'dev_only_secret_change_me',
  allowedDomains: (process.env.ALLOWED_DOMAINS || 'ves.ac.in')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean),
  feePercent: Math.min(50, Math.max(0, num(process.env.SERVICE_FEE_PERCENT, 0))),
  signupBonus: Math.max(0, num(process.env.SIGNUP_BONUS_COINS, 500)),
  minWithdraw: Math.max(1, num(process.env.MIN_WITHDRAW_COINS, 50)),
  timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  s3Bucket: process.env.S3_BUCKET || '',
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  isProd: process.env.NODE_ENV === 'production',
};
