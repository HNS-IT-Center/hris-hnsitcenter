-- Additive schema change: one Holiday table, day-off overrides.
--
-- Brings a database on the schema of branch chore/sprint-0 to the schema of
-- branch feat/S1-1-holiday-table. Generated with `prisma migrate diff` and made
-- re-runnable with MariaDB `IF NOT EXISTS`. Nothing is dropped; the only
-- changed column (ShiftOverride.shiftId) becomes nullable.
--
-- Run ONLY after the owner approves, on the target database (staging first),
-- after 2026-11-19-sso-notifikasi-lembur.sql, e.g.:
--   docker exec -i <mariadb-container> mariadb -u <user> -p <database> < this-file.sql
-- Take a dump before running it on any database that holds real data.
-- Then fill the table from the calendar: npx tsx scripts/backfill-holidays.ts --apply

-- ShiftOverride: a roster cell can now be a day off (no shift)
ALTER TABLE `ShiftOverride` DROP FOREIGN KEY IF EXISTS `ShiftOverride_shiftId_fkey`;
ALTER TABLE `ShiftOverride`
    ADD COLUMN IF NOT EXISTS `isDayOff` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `shiftId` VARCHAR(191) NULL;
ALTER TABLE `ShiftOverride`
    ADD CONSTRAINT `ShiftOverride_shiftId_fkey` FOREIGN KEY IF NOT EXISTS (`shiftId`)
    REFERENCES `Shift`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Holiday: the only holiday table
CREATE TABLE IF NOT EXISTS `Holiday` (
    `id` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `scope` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NULL,
    `departmentId` VARCHAR(191) NULL,
    `isRainyDay` BOOLEAN NOT NULL DEFAULT false,
    `calendarEventId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Holiday_calendarEventId_key`(`calendarEventId`),
    INDEX `Holiday_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Holiday`
    ADD CONSTRAINT `Holiday_storeId_fkey` FOREIGN KEY IF NOT EXISTS (`storeId`)
    REFERENCES `Store`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Holiday`
    ADD CONSTRAINT `Holiday_departmentId_fkey` FOREIGN KEY IF NOT EXISTS (`departmentId`)
    REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Holiday`
    ADD CONSTRAINT `Holiday_calendarEventId_fkey` FOREIGN KEY IF NOT EXISTS (`calendarEventId`)
    REFERENCES `CalendarEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Check: three rows, and ShiftOverride.shiftId IS_NULLABLE = YES.
SELECT TABLE_NAME, COLUMN_NAME, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND ((TABLE_NAME = 'ShiftOverride' AND COLUMN_NAME IN ('isDayOff', 'shiftId'))
    OR (TABLE_NAME = 'Holiday' AND COLUMN_NAME = 'calendarEventId'));
