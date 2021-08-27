-- phpMyAdmin SQL Dump
-- version 4.8.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Erstellungszeit: 28. Jul 2021 um 11:19
-- Server-Version: 10.1.33-MariaDB
-- PHP-Version: 7.2.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Datenbank: `inventur`
--
CREATE DATABASE IF NOT EXISTS `inventur` DEFAULT CHARACTER SET latin1 COLLATE latin1_swedish_ci;
USE `inventur`;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `article`
--

CREATE TABLE IF NOT EXISTS `article` (
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `unit_id` int(255) NOT NULL,
  `category_id` int(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `einheit_id` (`unit_id`),
  KEY `kategorieId` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `category`
--

CREATE TABLE IF NOT EXISTS `category` (
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `category` varchar(150) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `keyword`
--

CREATE TABLE IF NOT EXISTS `keyword` (
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `keyword` varchar(150) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `keyword_list`
--

CREATE TABLE IF NOT EXISTS `keyword_list` (
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `stock_id` int(255) NOT NULL,
  `keyword_id` int(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `stichwort_id` (`keyword_id`),
  KEY `stichwortliste_ibfk_1` (`stock_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `log`
--

CREATE TABLE IF NOT EXISTS `log` (
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `event` varchar(255) NOT NULL,
  `stock_id` int(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(255) NOT NULL,
  `keywords` varchar(255) NOT NULL,
  `location_id` int(11) NOT NULL,
  `location` varchar(255) NOT NULL,
  `date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `creator` varchar(255) NOT NULL,
  `change_by` varchar(255) NOT NULL,
  `number` int(255) NOT NULL,
  `minimum_number` int(255) NOT NULL,
  `deleted` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `mobile_list`
--

CREATE TABLE IF NOT EXISTS `mobile_list` (
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `creator` varchar(255) NOT NULL,
  `date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `mobile_list_entries`
--

CREATE TABLE IF NOT EXISTS `mobile_list_entries` (
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `list_id` int(255) NOT NULL,
  `stock_id` int(255) NOT NULL,
  `lay_in` tinyint(1) NOT NULL,
  `amount` int(255) NOT NULL,
  `status` int(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `artikelnummer` (`stock_id`),
  KEY `list_id` (`list_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `stock`
--

CREATE TABLE IF NOT EXISTS `stock` (
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `article_id` int(255) NOT NULL,
  `number` int(255) NOT NULL,
  `minimum_number` int(255) NOT NULL,
  `creator` varchar(255) NOT NULL,
  `change_by` varchar(255) NOT NULL,
  `date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `artikelid` (`article_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `storage_location`
--

CREATE TABLE IF NOT EXISTS `storage_location` (
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `parent` int(255) NOT NULL,
  `places` int(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `storage_place`
--

CREATE TABLE IF NOT EXISTS `storage_place` (
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `storage_location_id` int(255) NOT NULL,
  `place` int(255) NOT NULL,
  `stock_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `artikelliste_id` (`stock_id`),
  KEY `lagerort_id` (`storage_location_id`),
  KEY `lagerplatz_ibfk_1` (`stock_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `unit`
--

CREATE TABLE IF NOT EXISTS `unit` (
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `unit` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Constraints der exportierten Tabellen
--

--
-- Constraints der Tabelle `article`
--
ALTER TABLE `article`
  ADD CONSTRAINT `article_ibfk_1` FOREIGN KEY (`unit_id`) REFERENCES `unit` (`id`),
  ADD CONSTRAINT `article_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `category` (`id`);

--
-- Constraints der Tabelle `keyword_list`
--
ALTER TABLE `keyword_list`
  ADD CONSTRAINT `keyword_list_ibfk_1` FOREIGN KEY (`stock_id`) REFERENCES `stock` (`id`),
  ADD CONSTRAINT `keyword_list_ibfk_2` FOREIGN KEY (`keyword_id`) REFERENCES `keyword` (`id`);

--
-- Constraints der Tabelle `mobile_list_entries`
--
ALTER TABLE `mobile_list_entries`
  ADD CONSTRAINT `mobile_list_entries_ibfk_1` FOREIGN KEY (`stock_id`) REFERENCES `stock` (`id`),
  ADD CONSTRAINT `mobile_list_entries_ibfk_2` FOREIGN KEY (`list_id`) REFERENCES `mobile_list` (`id`);

--
-- Constraints der Tabelle `stock`
--
ALTER TABLE `stock`
  ADD CONSTRAINT `stock_ibfk_1` FOREIGN KEY (`article_id`) REFERENCES `article` (`id`);

--
-- Constraints der Tabelle `storage_place`
--
ALTER TABLE `storage_place`
  ADD CONSTRAINT `storage_place_ibfk_1` FOREIGN KEY (`storage_location_id`) REFERENCES `storage_location` (`id`),
  ADD CONSTRAINT `storage_place_ibfk_2` FOREIGN KEY (`stock_id`) REFERENCES `stock` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
