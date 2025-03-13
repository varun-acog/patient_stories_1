"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var readline_1 = require("readline");
var dotenv_1 = require("dotenv");
var youtube_js_1 = require("./lib/youtube.js");
var ollama_js_1 = require("./lib/ollama.js");
dotenv_1.default.config();
var rl = readline_1.default.createInterface({
    input: process.stdin,
    output: process.stdout,
});
function fetchAndAnalyzeDisease(disease) {
    return __awaiter(this, void 0, void 0, function () {
        var videos, analysis;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("\n\uFFFD\uFFFD Searching YouTube for videos related to \"".concat(disease, "\"..."));
                    return [4 /*yield*/, (0, youtube_js_1.searchDiseaseVideos)(disease, 5)];
                case 1:
                    videos = _a.sent();
                    if (videos.length === 0) {
                        console.log("❌ No videos found for this disease.");
                        return [2 /*return*/];
                    }
                    console.log("\n\uD83D\uDCCC Found ".concat(videos.length, " relevant video(s):\n"));
                    videos.forEach(function (video, index) {
                        console.log("".concat(index + 1, ". ").concat(video.title));
                        console.log("   \uD83C\uDFA5 Video Link: https://www.youtube.com/watch?v=".concat(video.id));
                        console.log("   \uD83D\uDCDD Description: ".concat(video.description.substring(0, 100), "...\n"));
                    });
                    console.log("\n🔬 Analyzing the first video transcript using Ollama...");
                    return [4 /*yield*/, (0, ollama_js_1.analyzeTranscript)(videos[0])];
                case 2:
                    analysis = _a.sent();
                    console.log("\n🩺 **Analysis Result**:");
                    console.log("\uD83D\uDCCC **Disease Name:** ".concat(analysis.diseaseName));
                    console.log("\uD83E\uDE79 **Symptoms:** ".concat(analysis.symptoms.join(", ") || "N/A"));
                    console.log("\uD83D\uDC8A **Treatments:** ".concat(analysis.treatments.join(", ") || "N/A"));
                    console.log("\uD83D\uDD11 **Key Takeaways:** ".concat(analysis.keyTakeaways.join("\n   - ") || "N/A"));
                    console.log("\uD83D\uDCCA **Relevance Score:** ".concat(analysis.relevanceScore, "/100"));
                    rl.question("\n🔁 Search another disease? (yes/no): ", function (answer) {
                        if (answer.toLowerCase() === "yes") {
                            startCLI();
                        }
                        else {
                            console.log("👋 Exiting... Stay Healthy!");
                            rl.close();
                        }
                    });
                    return [2 /*return*/];
            }
        });
    });
}
function startCLI() {
    var _this = this;
    rl.question("\n🩺 Enter a disease name to analyze: ", function (disease) { return __awaiter(_this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!disease.trim()) {
                        console.log("❌ Please enter a valid disease name.");
                        startCLI();
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetchAndAnalyzeDisease(disease.trim())];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    console.error("🚨 Error:", error_1);
                    rl.close();
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); });
}
// Start the CLI
console.log("💊 **Disease Analysis CLI** 💊");
startCLI();
