"use strict";

/**
 * Repository layer - handles database operations for scans
 */
class ScanRepository {
    constructor(db) {
        this.collection = db.collection("scans");
    }

    /**
     * Create a new scan record
     * @param {Object} scan - Scan object to insert
     * @returns {Promise<Object>} - Inserted scan
     */
    async create(scan) {
        const result = await this.collection.insertOne(scan);
        return { ...scan, _id: result.insertedId };
    }

    /**
     * Find scan by scanId
     * @param {string} scanId - Unique scan identifier
     * @returns {Promise<Object|null>} - Scan object or null
     */
    async findByScanId(scanId) {
        return await this.collection.findOne({ scanId });
    }

    /**
     * Find active scan (Queued or Scanning) for a repository
     * @param {string} repoUrl - Repository URL
     * @returns {Promise<Object|null>} - Active scan or null
     */
    async findActiveScanByRepoUrl(repoUrl) {
        return await this.collection.findOne({
            repoUrl,
            status: { $in: ["Queued", "Scanning"] }
        });
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

    /**
     * Get all scans (with optional pagination)
     * @param {number} limit - Max number of results
     * @param {number} skip - Number of results to skip
     * @returns {Promise<Array>} - Array of scans
     */
    async findAll(limit = 100, skip = 0) {
        return await this.collection
            .find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();
    }
}

module.exports = ScanRepository;

