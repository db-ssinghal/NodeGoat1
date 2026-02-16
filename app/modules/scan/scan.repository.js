"use strict";

const { ScanModel, ScanStatus } = require("./scan.model");

/**
 * Repository layer - handles database operations for scans
 */
class ScanRepository {
    constructor(db) {
        this.collection = db.collection("scans");
    }

    /**
     * Create a new scan record
     * @param {ScanModel} scan - ScanModel instance to insert
     * @returns {Promise<ScanModel>} - Inserted scan
     */
    async create(scan) {
        const doc = scan.toDocument();
        const result = await this.collection.insertOne(doc);
        return ScanModel.fromDocument({ ...doc, _id: result.insertedId });
    }

    /**
     * Find scan by scanId
     * @param {string} scanId - Unique scan identifier
     * @returns {Promise<ScanModel|null>} - ScanModel instance or null
     */
    async findByScanId(scanId) {
        const doc = await this.collection.findOne({ scanId });
        return ScanModel.fromDocument(doc);
    }

    /**
     * Find active scan (Queued or Scanning) for a repository
     * @param {string} repoUrl - Repository URL
     * @returns {Promise<ScanModel|null>} - Active scan or null
     */
    async findActiveScanByRepoUrl(repoUrl) {
        const doc = await this.collection.findOne({
            repoUrl,
            status: { $in: [ScanStatus.QUEUED, ScanStatus.SCANNING] }
        });
        return ScanModel.fromDocument(doc);
    }

    /**
     * Update scan status and additional data
     * @param {string} scanId - Unique scan identifier
     * @param {string} status - New status
     * @param {Object} additionalData - Additional fields to update
     * @returns {Promise<boolean>} - Success status
     */
    async updateStatus(scanId, status, additionalData = {}) {
        const result = await this.collection.updateOne(
            { scanId },
            {
                $set: {
                    status,
                    updatedAt: new Date(),
                    ...additionalData
                }
            }
        );
        return result.modifiedCount > 0;
    }
}

module.exports = ScanRepository;

