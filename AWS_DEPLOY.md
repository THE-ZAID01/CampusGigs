# CampusGigs on AWS (CCL project): manual steps

Architecture: Browser -> **EC2** (Node/Express serves the React build and the API) -> **RDS PostgreSQL** (users, gigs, bids, wallet) and **S3** (profile and gig images). **IAM (LabRole)** lets EC2 reach S3 with no keys in code.
Everything lives in ONE Learner Lab account (the host's). Region: **us-east-1**.

## What changed from the SEA version
| File | Change |
|---|---|
| server/package.json | added @aws-sdk/client-s3 |
| server/src/services/storage.js | NEW: saves images to S3 (local folder if S3_BUCKET is empty) |
| server/src/routes/index.js | /api/health now reports database + storage; NEW /api/media/:folder/:file serves S3 images (bucket stays private) |
| server/src/controllers/userController.js | profile photo goes to S3 instead of base64 in the DB |
| server/src/controllers/gigController.js, utils/mappers.js | gigs accept a cover image stored in S3 |
| server/db/schema.sql | gigs.image_url column |
| server/src/config/env.js, .env.example | S3_BUCKET, AWS_REGION |
| server/src/app.js | JSON body limit 3 MB |
| client PostGigModal, GigCard, GigDetail, app.css | cover image upload + display |
| aws/ | NEW: EC2 setup script and env template |
All escrow, GigCoins, wallet, profile and history features are unchanged.

## Phase 1: AWS resources (host, about 1 hour)
Start Learner Lab -> open the AWS Console -> region **us-east-1**.

1. **Security groups** (EC2 -> Security Groups -> Create)
   - `ec2-sg`: inbound SSH 22 from *My IP*; Custom TCP **5000** from 0.0.0.0/0.
   - `rds-sg`: inbound PostgreSQL **5432**, source = `ec2-sg`.
2. **RDS** (start this first, it takes about 10 min): Create database -> Standard -> PostgreSQL -> Dev/Test.
   Identifier `campusgigs-db`, user `postgres`, set a password (avoid special characters like @ : / # to keep the URL simple).
   db.t3.micro, gp3 20 GB, storage autoscaling OFF, Public access **No**, security group `rds-sg`, Multi-AZ OFF.
   Additional configuration -> Initial database name `campusgigs`. Copy the **endpoint** when Available.
3. **S3**: Create bucket `campusgigs-<rollno>-images`, us-east-1, keep **Block all public access ON**.
4. **EC2**: Launch instance -> Ubuntu 22.04, t2.micro, key pair `vockey`, security group `ec2-sg`.
   Advanced details -> **IAM instance profile = LabInstanceProfile**. Download the .pem from Learner Lab -> AWS Details.

## Phase 2: Deploy on EC2
```bash
chmod 400 labsuser.pem
ssh -i labsuser.pem ubuntu@<EC2_PUBLIC_IP>

git clone <your-repo-url> campusgigs && cd campusgigs
bash aws/setup-ec2.sh
cp aws/env.aws.example server/.env && nano server/.env     # fill in endpoint, password, bucket, IP
npm run install:all
npm run db:setup          # creates tables and demo users on RDS
npm run build             # builds the React client
cd server && pm2 start src/server.js --name campusgigs && pm2 save
```
Open `http://<EC2_PUBLIC_IP>:5000`. Demo login: `aarav@ves.ac.in` / `demo1234`.

## Phase 3: Verify (also your demo checklist)
1. `http://<EC2_PUBLIC_IP>:5000/api/health` shows `"database":"connected","storage":"s3"`.
2. Sign up or log in, upload a profile photo, then check the object appears in the S3 bucket under `avatars/`.
3. Post a gig with a cover image: the object appears under `gigs/` and the image shows on the card.
4. Run the escrow flow: bid, accept (coins held), deliver, confirm (coins released), then check the wallet.
5. Screenshots: EC2 with IAM role, RDS connectivity, `rds-sg` rule, S3 objects, `psql` query `SELECT id,title,status,image_url FROM gigs;`.

If images fail with AccessDenied, check EC2 -> Actions -> Security -> Modify IAM role = LabInstanceProfile.
If the app cannot reach RDS, check that `rds-sg` allows 5432 from `ec2-sg`, that DB_SSL=true, and that the password in DATABASE_URL is URL-encoded.

## Credits and sessions
- Cost is about $0.03/hr for EC2 + RDS together; a few dollars total if you stop them each day.
- Stop EC2 and RDS from the console at day end. After a restart start RDS first, then EC2; the EC2 public IP changes, so use the new one and run `pm2 restart campusgigs`.
- Start both services 30 minutes before the presentation.
