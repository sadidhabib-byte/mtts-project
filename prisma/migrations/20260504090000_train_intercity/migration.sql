-- CreateTable
CREATE TABLE `TrainStation` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `district` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TrainStation_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Train` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `startStationId` VARCHAR(191) NOT NULL,
    `endStationId` VARCHAR(191) NOT NULL,
    `departureTime` TIME(0) NOT NULL,
    `fare` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Train_startStationId_endStationId_idx`(`startStationId`, `endStationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TrainCompartment` (
    `id` VARCHAR(191) NOT NULL,
    `trainId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `totalSeats` INTEGER NOT NULL DEFAULT 50,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TrainCompartment_trainId_name_key`(`trainId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TrainSeatHold` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `trainId` VARCHAR(191) NOT NULL,
    `journeyDate` DATE NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TrainSeatHold_userId_expiresAt_idx`(`userId`, `expiresAt`),
    INDEX `TrainSeatHold_trainId_journeyDate_expiresAt_idx`(`trainId`, `journeyDate`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TrainBooking` (
    `id` VARCHAR(191) NOT NULL,
    `bookingRef` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `trainId` VARCHAR(191) NOT NULL,
    `journeyDate` DATE NOT NULL,
    `departureTime` TIME(0) NOT NULL,
    `amount` INTEGER NOT NULL,
    `paymentMethod` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `confirmedAt` DATETIME(3) NULL,

    UNIQUE INDEX `TrainBooking_bookingRef_key`(`bookingRef`),
    INDEX `TrainBooking_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `TrainBooking_trainId_journeyDate_idx`(`trainId`, `journeyDate`),
    INDEX `TrainBooking_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TrainBookingSeat` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `trainId` VARCHAR(191) NOT NULL,
    `compartmentId` VARCHAR(191) NOT NULL,
    `seatNumber` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TrainBookingSeat_trainId_compartmentId_seatNumber_idx`(`trainId`, `compartmentId`, `seatNumber`),
    UNIQUE INDEX `TrainBookingSeat_bookingId_compartmentId_seatNumber_key`(`bookingId`, `compartmentId`, `seatNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TrainSeatState` (
    `id` VARCHAR(191) NOT NULL,
    `trainId` VARCHAR(191) NOT NULL,
    `compartmentId` VARCHAR(191) NOT NULL,
    `journeyDate` DATE NOT NULL,
    `seatNumber` INTEGER NOT NULL,
    `state` ENUM('AVAILABLE', 'HELD', 'BOOKED') NOT NULL DEFAULT 'AVAILABLE',
    `holdId` VARCHAR(191) NULL,
    `bookingId` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TrainSeatState_trainId_journeyDate_state_idx`(`trainId`, `journeyDate`, `state`),
    INDEX `TrainSeatState_compartmentId_journeyDate_idx`(`compartmentId`, `journeyDate`),
    INDEX `TrainSeatState_expiresAt_idx`(`expiresAt`),
    UNIQUE INDEX `TrainSeatState_trainId_journeyDate_compartmentId_seatNumber_key`(`trainId`, `journeyDate`, `compartmentId`, `seatNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Train` ADD CONSTRAINT `Train_startStationId_fkey` FOREIGN KEY (`startStationId`) REFERENCES `TrainStation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Train` ADD CONSTRAINT `Train_endStationId_fkey` FOREIGN KEY (`endStationId`) REFERENCES `TrainStation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrainCompartment` ADD CONSTRAINT `TrainCompartment_trainId_fkey` FOREIGN KEY (`trainId`) REFERENCES `Train`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrainSeatHold` ADD CONSTRAINT `TrainSeatHold_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrainSeatHold` ADD CONSTRAINT `TrainSeatHold_trainId_fkey` FOREIGN KEY (`trainId`) REFERENCES `Train`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrainBooking` ADD CONSTRAINT `TrainBooking_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrainBooking` ADD CONSTRAINT `TrainBooking_trainId_fkey` FOREIGN KEY (`trainId`) REFERENCES `Train`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrainBookingSeat` ADD CONSTRAINT `TrainBookingSeat_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `TrainBooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrainBookingSeat` ADD CONSTRAINT `TrainBookingSeat_trainId_fkey` FOREIGN KEY (`trainId`) REFERENCES `Train`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrainBookingSeat` ADD CONSTRAINT `TrainBookingSeat_compartmentId_fkey` FOREIGN KEY (`compartmentId`) REFERENCES `TrainCompartment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrainSeatState` ADD CONSTRAINT `TrainSeatState_trainId_fkey` FOREIGN KEY (`trainId`) REFERENCES `Train`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrainSeatState` ADD CONSTRAINT `TrainSeatState_compartmentId_fkey` FOREIGN KEY (`compartmentId`) REFERENCES `TrainCompartment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrainSeatState` ADD CONSTRAINT `TrainSeatState_holdId_fkey` FOREIGN KEY (`holdId`) REFERENCES `TrainSeatHold`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrainSeatState` ADD CONSTRAINT `TrainSeatState_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `TrainBooking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
