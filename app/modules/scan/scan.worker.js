"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const { parser } = require("stream-json");
const { pick } = require("stream-json/filters/Pick");
const { streamArray } = require("stream-json/streamers/StreamArray");
const { chain } = require("stream-chain");

const SCAN_DIR = "/tmp/scans";

// Ensure scan directory exists
if (!fs.existsSync(SCAN_DIR)) {
    fs.mkdirSync(SCAN_DIR, { recursive: true });
}

/**
 * Worker layer - handles the actual Trivy scanning process
 * Responsible for: spawning Trivy, streaming JSON results, cleanup
 */
class ScanWorker {
    /**
     * Execute Trivy scan on a repository
     * @param {string} scanId - Unique scan identifier
     * @param {string} repoUrl - GitHub repository URL
     * @returns {Promise<string>} - Path to the JSON results file
     */
    async executeTrivyScan(scanId, repoUrl) {
        const jsonFilePath = path.join(SCAN_DIR, `${scanId}.json`);

        await new Promise((resolve, reject) => {
            const trivyProcess = spawn("trivy", [
                "repo", repoUrl,
                "--format", "json",
                "--output", jsonFilePath,
                "--scanners", "vuln"
            ]);

            trivyProcess.stderr.on("data", (data) => {
                console.log(`[ScanWorker] Trivy stderr: ${data.toString()}`);
            });

            trivyProcess.on("close", (code) => {
                if (code !== 0) {
                    reject(new Error(`Trivy exited with code ${code}`));
                } else {
                    resolve();
                }
            });

            trivyProcess.on("error", (err) => {
                console.error(`[ScanWorker] Trivy process error:`, err);
                reject(err);
            });
        });

        return jsonFilePath;
    }

    /**
     * Process Trivy JSON output using streams (memory efficient)
     * IMPORTANT: We use streams to avoid loading entire JSON into memory
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
                            criticalVulnerabilities.push({
                                vulnerabilityId: vuln.VulnerabilityID,
                                pkgName: vuln.PkgName,
                                installedVersion: vuln.InstalledVersion,
                                fixedVersion: vuln.FixedVersion,
                                title: vuln.Title,
                                severity: vuln.Severity
                            });
                        }
                    });
                }
            });

            pipeline.on("end", () => {
                console.log(`[ScanWorker] Found ${criticalVulnerabilities.length} critical vulnerabilities`);
                resolve(criticalVulnerabilities);
            });

            pipeline.on("error", (err) => {
                console.error(`[ScanWorker] Error processing results:`, err);
                reject(err);
            });
        });
    }

    /**
     * Cleanup temporary files after scan
     * @param {string} jsonFilePath - Path to the JSON file to delete
     */
    async cleanup(jsonFilePath) {
        try {
            await fsPromises.unlink(jsonFilePath);
            console.log(`[ScanWorker] Cleaned up ${jsonFilePath}`);
        } catch (err) {
            console.error(`[ScanWorker] Error deleting ${jsonFilePath}:`, err);
        }
    }
}

module.exports = new ScanWorker();

