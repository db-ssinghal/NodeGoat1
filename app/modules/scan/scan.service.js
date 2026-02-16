"use strict";

const { v4: uuidv4 } = require("uuid");
const ScanRepository = require("./scan.repository");
const scanWorker = require("./scan.worker");

/**
 * Scan status enum
 */
const ScanStatus = {
    QUEUED: "Queued",
    SCANNING: "Scanning",
    FINISHED: "Finished",
    FAILED: "Failed"
};

/**
 * Service layer - business logic for scan operations
 */
class ScanService {
    constructor(db) {
        this.repository = new ScanRepository(db);
    }

    /**
     * Validate GitHub repository URL
     * @param {string} repoUrl - URL to validate
     * @returns {boolean} - Is valid
     */
    isValidGithubUrl(repoUrl) {
        const githubUrlPattern = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?$/;
        return githubUrlPattern.test(repoUrl);
    }

    /**
     * Create a new scan job
     * @param {string} repoUrl - GitHub repository URL
     * @returns {Promise<Object>} - Created scan info
     * @throws {Error} - If validation fails or scan already exists
     */
    async createScan(repoUrl) {
        // Check for existing active scan
        const existingScan = await this.repository.findActiveScanByRepoUrl(repoUrl);
        if (existingScan) {
            const error = new Error("A scan for this repository is already in progress");
            error.code = "SCAN_IN_PROGRESS";
            error.existingScan = {
                scanId: existingScan.scanId,
                status: existingScan.status
            };
            throw error;
        }

        // Create scan record
        const scanId = uuidv4();
        const scan = {
            scanId,
            repoUrl,
            status: ScanStatus.QUEUED,
            createdAt: new Date(),
            updatedAt: new Date(),
            criticalVulnerabilities: []
        };

        await this.repository.create(scan);

        // Trigger background scan (non-blocking)
        this.runScanInBackground(scanId, repoUrl);

        return {
            scanId,
            status: ScanStatus.QUEUED
        };
    }

    /**
     * Run the scan process in background
     * @param {string} scanId - Scan identifier
     * @param {string} repoUrl - Repository URL
     */
    async runScanInBackground(scanId, repoUrl) {
        try {
            // Update status to Scanning
            await this.repository.updateStatus(scanId, ScanStatus.SCANNING);

            console.log(`[ScanService] Starting scan ${scanId} for ${repoUrl}`);

            // Execute Trivy scan
            const jsonFilePath = await scanWorker.executeTrivyScan(scanId, repoUrl);

            console.log(`[ScanService] Trivy completed for ${scanId}, processing results...`);

            // Process results using streams
            const criticalVulnerabilities = await scanWorker.processResults(jsonFilePath);

            // Update with results
            await this.repository.updateStatus(scanId, ScanStatus.FINISHED, {
                criticalVulnerabilities
            });

            console.log(`[ScanService] Scan ${scanId} finished successfully`);

            // Cleanup
            await scanWorker.cleanup(jsonFilePath);

        } catch (err) {
            console.error(`[ScanService] Scan ${scanId} failed:`, err);
            await this.repository.updateStatus(scanId, ScanStatus.FAILED, {
                error: err.message
            });
        }
    }

    /**
     * Get scan by ID
     * @param {string} scanId - Scan identifier
     * @returns {Promise<Object|null>} - Scan data
     */
    async getScanById(scanId) {
        const scan = await this.repository.findByScanId(scanId);

        if (!scan) {
            return null;
        }

        return {
            scanId: scan.scanId,
            repoUrl: scan.repoUrl,
            status: scan.status,
            createdAt: scan.createdAt,
            updatedAt: scan.updatedAt,
            criticalVulnerabilities: scan.criticalVulnerabilities,
            error: scan.error
        };
    }

    /**
     * Get all scans
     * @param {number} limit - Max results
     * @param {number} skip - Skip results
     * @returns {Promise<Array>} - Array of scans
     */
    async getAllScans(limit = 100, skip = 0) {
        return await this.repository.findAll(limit, skip);
    }
}

module.exports = ScanService;

