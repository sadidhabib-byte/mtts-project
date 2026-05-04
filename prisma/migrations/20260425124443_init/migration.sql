-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MetroStation` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `MetroStation_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MetroFare` (
    `id` VARCHAR(191) NOT NULL,
    `fromStationId` VARCHAR(191) NOT NULL,
    `toStationId` VARCHAR(191) NOT NULL,
    `fare` INTEGER NOT NULL,

    INDEX `MetroFare_toStationId_idx`(`toStationId`),
    UNIQUE INDEX `MetroFare_fromStationId_toStationId_key`(`fromStationId`, `toStationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaction` (
    `id` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `startStationId` VARCHAR(191) NOT NULL,
    `endStationId` VARCHAR(191) NOT NULL,
    `fare` INTEGER NOT NULL,
    `paymentMethod` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `validTill` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Transaction_transactionId_key`(`transactionId`),
    INDEX `Transaction_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `Transaction_startStationId_idx`(`startStationId`),
    INDEX `Transaction_endStationId_idx`(`endStationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MetroFare` ADD CONSTRAINT `MetroFare_fromStationId_fkey` FOREIGN KEY (`fromStationId`) REFERENCES `MetroStation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MetroFare` ADD CONSTRAINT `MetroFare_toStationId_fkey` FOREIGN KEY (`toStationId`) REFERENCES `MetroStation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_startStationId_fkey` FOREIGN KEY (`startStationId`) REFERENCES `MetroStation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_endStationId_fkey` FOREIGN KEY (`endStationId`) REFERENCES `MetroStation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
