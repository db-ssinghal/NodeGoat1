"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const { parser } = require("stream-json");
const { pick } = require("stream-json/filters/Pick");
const { streamArray } = require("stream-json/streamers/StreamArray");
const { chain } = require("stream-chain");

const BaseScanWorker = require("./base.scan.worker");

const SCAN_DIR = "/tmp/scans";

// Ensure scan directory exists
if (!fs.existsSync(SCAN_DIR)) {
    fs.mkdirSync(SCAN_DIR, { recursive: true });
}

/**
 * Trivy scanner implementation
 */
class TrivyScanWorker extends BaseScanWorker {
    constructor() {
        super("trivy");
    }

    /**
     * Execute Trivy scan on a repository
     * @param {string} scanId - Unique scan identifier
     * @param {string} repoUrl - GitHub repository URL
     * @returns {Promise<string>} - Path to the JSON results file
     */
    async executeScan(scanId, repoUrl) {
        const jsonFilePath = path.join(SCAN_DIR, `${scanId}.json`);

        await new Promise((resolve, reject) => {
            const trivyProcess = spawn("trivy", [
                "repo", repoUrl,
                "--format", "json",
                "--output", jsonFilePath,
                "--scanners", "vuln"
            ]);

            trivyProcess.stderr.on("data", (data) => {
                console.log(`[TrivyScanWorker#executeScan] stderr: ${data.toString()}`);
            });

            trivyProcess.on("close", (code) => {
                if (code !== 0) {
                    reject(new Error(`Trivy exited with code ${code}`));
                } else {
                    resolve();
                }
            });

            trivyProcess.on("error", (err) => {
                console.error(`[TrivyScanWorker#executeScan] Process error:`, err);
                reject(err);
            });
        });

        return jsonFilePath;
    }

    /**
     *
     * @param {string} jsonFilePath - Path to the Trivy JSON output
     * @returns {Promise<Array>} - Array of critical vulnerabilities
     */
    async processResults(jsonFilePath) {
        return new Promise((resolve, reject) => {
            const criticalVulnerabilities = [];

            const pipeline = chain([
                fs.createReadStream(jsonFilePath),
                parser(),
                pick({ filter: "Results" }),
                streamArray()
            ]);

            pipeline.on("data", ({ value }) => {
                if (value && value.Vulnerabilities && Array.isArray(value.Vulnerabilities)) {
                    value.Vulnerabilities.forEach((vuln) => {
                        if (vuln.Severity === "CRITICAL") {
                            criticalVulnerabilities.push(this._mapVulnerability(vuln));
                        }
                    });
                }
            });

            pipeline.on("end", () => {
                console.log(`[TrivyScanWorker] Found ${criticalVulnerabilities.length} critical vulnerabilities`);
                resolve(criticalVulnerabilities);
            });

            pipeline.on("error", (err) => {
                console.error(`[TrivyScanWorker] Error processing results:`, err);
                reject(err);
            });
        });
    }

    /**
     * Map Trivy vulnerability to common format
     * @param {Object} vuln - Trivy vulnerability object
     * @returns {Object} - Normalized vulnerability object
     * @private
     */
    _mapVulnerability(vuln) {
        return {
            vulnerabilityId: vuln.VulnerabilityID,
            pkgName: vuln.PkgName,
            installedVersion: vuln.InstalledVersion,
            fixedVersion: vuln.FixedVersion,
            title: vuln.Title,
            description: vuln.Description,
            severity: vuln.Severity,
            references: vuln.References || [],
            scanner: this.name
        };
    }

    /**
     * Cleanup temporary files after scan
     * @param {string} jsonFilePath - Path to the JSON file to delete
     */
    async cleanup(jsonFilePath) {
        try {
            await fsPromises.unlink(jsonFilePath);
            console.log(`[TrivyScanWorker] Cleaned up ${jsonFilePath}`);
        } catch (err) {
            console.error(`[TrivyScanWorker] Error deleting ${jsonFilePath}:`, err);
        }
    }
}

module.exports = TrivyScanWorker;

