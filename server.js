const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

const JDoodle_CLIENT_ID = "your_client_id"; // Replace with your JDoodle Client ID
const JDoodle_CLIENT_SECRET = "your_client_secret"; // Replace with your JDoodle Client Secret

const languageMap = {
    "python": "python3",
    "javascript": "nodejs",
    "c": "c",
    "cpp": "cpp",
    "ruby": "ruby",
    "rust": "rust",
    "go": "go"
};

app.post("/execute", async (req, res) => {
    const { code, language, input } = req.body;

    if (!languageMap[language]) {
        return res.status(400).json({ error: "Unsupported language" });
    }

    try {
        const response = await axios.post("https://api.jdoodle.com/v1/execute", {
            script: code,
            language: languageMap[language],
            versionIndex: "0",
            stdin: input,
            clientId: JDoodle_CLIENT_ID,
            clientSecret: JDoodle_CLIENT_SECRET
        });

        res.json({ output: response.data.output });
    } catch (error) {
        res.status(500).json({ error: "Execution error", details: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
