-- Additive schema change: attendance settings (Pusat Pengaturan Absensi).
--
-- Brings a database on the schema of commit 72c71fa (main after Sprint 1) to the
-- schema of branch feat/S2-1-policy-tables. Generated with `prisma migrate diff`
-- and made re-runnable with MariaDB `IF NOT EXISTS`. Nothing is dropped.
--
-- The starting values are the numbers the code used before Sprint 2, so
-- attendance, logs and payslips do not change when this file runs.
--
-- Run ONLY after the owner approves, on the target database (staging first),
-- after 2026-11-20-holiday-dan-override.sql, e.g.:
--   docker exec -i <mariadb-container> mariadb -u <user> -p <database> < this-file.sql
-- Take a dump before running it on any database that holds real data.

-- Shift: end of a weekly half day (was 14:00 in code)
ALTER TABLE `Shift` ADD COLUMN IF NOT EXISTS `halfDayEndTime` VARCHAR(191) NOT NULL DEFAULT '14:00';

-- The code opened check-in 30 minutes early when a shift said 15 (an old
-- default). The rule is now read as stored, so store 30 to keep the same window.
UPDATE `Shift` SET `checkinWindowMin` = 30 WHERE `checkinWindowMin` = 15;

CREATE TABLE IF NOT EXISTS `AttendancePolicy` (
    `id` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NULL,
    `effectiveFrom` DATE NOT NULL,
    `lateToleranceMin` INTEGER NOT NULL DEFAULT 0,
    `checkoutGraceMin` INTEGER NOT NULL DEFAULT 55,
    `rainyGraceMin` INTEGER NOT NULL DEFAULT 60,
    `latePenalty` INTEGER NOT NULL DEFAULT 20000,
    `forgotPenalty` INTEGER NOT NULL DEFAULT 20000,
    `updatedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AttendancePolicy_storeId_effectiveFrom_key`(`storeId`, `effectiveFrom`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AttendancePolicy`
    ADD CONSTRAINT `AttendancePolicy_storeId_fkey` FOREIGN KEY IF NOT EXISTS (`storeId`)
    REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS `LeaveTypeConfig` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `requiresAttachment` BOOLEAN NOT NULL DEFAULT false,
    `attachmentDays` INTEGER NULL,
    `isPaid` BOOLEAN NOT NULL DEFAULT true,
    `paidOnlyWithAttachment` BOOLEAN NOT NULL DEFAULT false,
    `deductsQuota` BOOLEAN NOT NULL DEFAULT false,
    `annualQuotaDays` INTEGER NULL,
    `maxDaysPerRequest` INTEGER NULL,
    `minNoticeDays` INTEGER NOT NULL DEFAULT 0,
    `allowHalfDay` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `updatedById` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LeaveTypeConfig_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Starting values. The global row (storeId NULL) starts long before go-live so
-- every past day has a rule. NULL is not unique in MariaDB, hence NOT EXISTS.
INSERT INTO `AttendancePolicy` (`id`, `storeId`, `effectiveFrom`, `lateToleranceMin`, `checkoutGraceMin`, `rainyGraceMin`, `latePenalty`, `forgotPenalty`)
SELECT 'policy-global-initial', NULL, '2020-01-01', 0, 55, 60, 20000, 20000
WHERE NOT EXISTS (SELECT 1 FROM `AttendancePolicy` WHERE `storeId` IS NULL);

INSERT IGNORE INTO `LeaveTypeConfig`
    (`id`, `code`, `name`, `requiresAttachment`, `attachmentDays`, `isPaid`, `paidOnlyWithAttachment`, `deductsQuota`, `annualQuotaDays`, `maxDaysPerRequest`, `minNoticeDays`, `allowHalfDay`, `isActive`, `updatedAt`)
VALUES
    ('leave-type-annual',   'ANNUAL_LEAVE', 'Cuti Tahunan',       false, NULL, true,  false, true,  12,   NULL, 0, false, true, CURRENT_TIMESTAMP(3)),
    ('leave-type-sick',     'SICK',         'Sakit',              true,  3,    true,  true,  false, NULL, NULL, 0, false, true, CURRENT_TIMESTAMP(3)),
    ('leave-type-personal', 'PERSONAL',     'Izin',               false, NULL, false, false, false, NULL, NULL, 0, false, true, CURRENT_TIMESTAMP(3)),
    ('leave-type-half-day', 'HALF_DAY',     'Izin Setengah Hari', false, NULL, true,  false, false, NULL, NULL, 0, true,  true, CURRENT_TIMESTAMP(3));

-- Check: one global policy row, four leave types, no shift left with 15.
SELECT
    (SELECT COUNT(*) FROM `AttendancePolicy` WHERE `storeId` IS NULL) AS global_policies,
    (SELECT COUNT(*) FROM `LeaveTypeConfig`) AS leave_types,
    (SELECT COUNT(*) FROM `Shift` WHERE `checkinWindowMin` = 15) AS shifts_with_15;
