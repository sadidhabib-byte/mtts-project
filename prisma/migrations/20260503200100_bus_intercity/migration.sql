-- CreateTable
CREATE TABLE `BusOperator` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BusOperator_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bus` (
    `id` VARCHAR(191) NOT NULL,
    `operatorId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Bus_operatorId_idx`(`operatorId`),
    UNIQUE INDEX `Bus_operatorId_name_key`(`operatorId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusSeatLayout` (
    `id` VARCHAR(191) NOT NULL,
    `busId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `layoutJson` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BusSeatLayout_busId_key`(`busId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusRoute` (
    `id` VARCHAR(191) NOT NULL,
    `fromCity` VARCHAR(191) NOT NULL,
    `toCity` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BusRoute_toCity_idx`(`toCity`),
    UNIQUE INDEX `BusRoute_fromCity_toCity_key`(`fromCity`, `toCity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusTrip` (
    `id` VARCHAR(191) NOT NULL,
    `routeId` VARCHAR(191) NOT NULL,
    `busId` VARCHAR(191) NOT NULL,
    `journeyDate` DATE NOT NULL,
    `departureTime` TIME(0) NOT NULL,
    `fare` INTEGER NOT NULL,
    `busType` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BusTrip_routeId_journeyDate_idx`(`routeId`, `journeyDate`),
    INDEX `BusTrip_busId_journeyDate_idx`(`busId`, `journeyDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusSeatHold` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tripId` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BusSeatHold_userId_expiresAt_idx`(`userId`, `expiresAt`),
    INDEX `BusSeatHold_tripId_expiresAt_idx`(`tripId`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusBooking` (
    `id` VARCHAR(191) NOT NULL,
    `bookingRef` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tripId` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `paymentMethod` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `confirmedAt` DATETIME(3) NULL,

    UNIQUE INDEX `BusBooking_bookingRef_key`(`bookingRef`),
    INDEX `BusBooking_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `BusBooking_tripId_createdAt_idx`(`tripId`, `createdAt`),
    INDEX `BusBooking_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusBookingSeat` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `tripId` VARCHAR(191) NOT NULL,
    `seatCode` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BusBookingSeat_tripId_seatCode_idx`(`tripId`, `seatCode`),
    UNIQUE INDEX `BusBookingSeat_bookingId_seatCode_key`(`bookingId`, `seatCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusTripSeatState` (
    `id` VARCHAR(191) NOT NULL,
    `tripId` VARCHAR(191) NOT NULL,
    `seatCode` VARCHAR(191) NOT NULL,
    `state` ENUM('AVAILABLE', 'HELD', 'BOOKED') NOT NULL DEFAULT 'AVAILABLE',
    `holdId` VARCHAR(191) NULL,
    `bookingId` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BusTripSeatState_tripId_state_idx`(`tripId`, `state`),
    INDEX `BusTripSeatState_expiresAt_idx`(`expiresAt`),
    UNIQUE INDEX `BusTripSeatState_tripId_seatCode_key`(`tripId`, `seatCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Bus` ADD CONSTRAINT `Bus_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `BusOperator`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusSeatLayout` ADD CONSTRAINT `BusSeatLayout_busId_fkey` FOREIGN KEY (`busId`) REFERENCES `Bus`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusTrip` ADD CONSTRAINT `BusTrip_routeId_fkey` FOREIGN KEY (`routeId`) REFERENCES `BusRoute`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusTrip` ADD CONSTRAINT `BusTrip_busId_fkey` FOREIGN KEY (`busId`) REFERENCES `Bus`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusSeatHold` ADD CONSTRAINT `BusSeatHold_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusSeatHold` ADD CONSTRAINT `BusSeatHold_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `BusTrip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusBooking` ADD CONSTRAINT `BusBooking_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusBooking` ADD CONSTRAINT `BusBooking_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `BusTrip`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusBookingSeat` ADD CONSTRAINT `BusBookingSeat_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `BusBooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusBookingSeat` ADD CONSTRAINT `BusBookingSeat_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `BusTrip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusTripSeatState` ADD CONSTRAINT `BusTripSeatState_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `BusTrip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusTripSeatState` ADD CONSTRAINT `BusTripSeatState_holdId_fkey` FOREIGN KEY (`holdId`) REFERENCES `BusSeatHold`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusTripSeatState` ADD CONSTRAINT `BusTripSeatState_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `BusBooking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

