-- CreateTable
CREATE TABLE `error_logs` (
    `id` VARCHAR(191) NOT NULL,
    `level` VARCHAR(191) NOT NULL DEFAULT 'error',
    `message` TEXT NOT NULL,
    `stack` TEXT NULL,
    `code` VARCHAR(191) NULL,
    `statusCode` INTEGER NULL,
    `userId` VARCHAR(191) NULL,
    `route` VARCHAR(191) NULL,
    `method` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `resolved` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `error_logs_level_idx`(`level`),
    INDEX `error_logs_resolved_idx`(`resolved`),
    INDEX `error_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
