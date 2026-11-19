-- Additive schema change: SSO sessions, notification category, overtime settings and pay.
--
-- Brings a database on the schema of commit 5cf4b86 to the schema of branch chore/sprint-0.
-- Generated with `prisma migrate diff` (old schema -> prisma/schema.prisma) and made
-- re-runnable with MariaDB `IF NOT EXISTS`. Nothing is dropped or renamed.
--
-- Run ONLY after the owner approves, on the target database (staging first), e.g.:
--   docker exec -i <mariadb-container> mariadb -u <user> -p <database> < this-file.sql
-- Take a dump before running it on any database that holds real data.

-- User: SSO subject (the only key for SSO logins)
ALTER TABLE `User` ADD COLUMN IF NOT EXISTS `ssoSub` VARCHAR(191) NULL;
CREATE UNIQUE INDEX IF NOT EXISTS `User_ssoSub_key` ON `User`(`ssoSub`);

-- AppNotification: category for the notification hub
ALTER TABLE `AppNotification` ADD COLUMN IF NOT EXISTS `category` VARCHAR(191) NOT NULL DEFAULT 'SYSTEM';

-- Overtime pay
ALTER TABLE `UserPayrollConfig` ADD COLUMN IF NOT EXISTS `overtimeHourlyRate` INTEGER NULL;
ALTER TABLE `PayrollSlip`
    ADD COLUMN IF NOT EXISTS `lemburJam` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `tarifLembur` INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS `OvertimeSetting` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `roundingThresholdMinutes` INTEGER NOT NULL DEFAULT 45,
    `defaultHourlyRate` INTEGER NOT NULL DEFAULT 20000,
    `updatedById` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Server-side sessions (HNS SSO)
CREATE TABLE IF NOT EXISTS `AuthSession` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `ssoSid` VARCHAR(191) NULL,
    `idToken` TEXT NOT NULL,
    `accessToken` TEXT NOT NULL,
    `refreshToken` TEXT NULL,
    `accessTokenExpiresAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `rememberDevice` BOOLEAN NOT NULL DEFAULT false,
    `refreshLockedUntil` DATETIME(3) NULL,
    `revokedAt` DATETIME(3) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AuthSession_ssoSid_idx`(`ssoSid`),
    INDEX `AuthSession_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AuthSession`
    ADD CONSTRAINT `AuthSession_userId_fkey` FOREIGN KEY IF NOT EXISTS (`userId`)
    REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Check: every row below should be present after running this file.
SELECT TABLE_NAME, COLUMN_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND ((TABLE_NAME = 'User' AND COLUMN_NAME = 'ssoSub')
    OR (TABLE_NAME = 'AppNotification' AND COLUMN_NAME = 'category')
    OR (TABLE_NAME = 'UserPayrollConfig' AND COLUMN_NAME = 'overtimeHourlyRate')
    OR (TABLE_NAME = 'PayrollSlip' AND COLUMN_NAME IN ('lemburJam', 'tarifLembur'))
    OR (TABLE_NAME IN ('AuthSession', 'OvertimeSetting') AND COLUMN_NAME = 'id'));
