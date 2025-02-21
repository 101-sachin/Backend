const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const JDoodle_CLIENT_ID = "86f87263761cd5b87b4f4c09d99bcf2f"; 
const JDoodle_CLIENT_SECRET = "4c13ec68477e5617e1db5fffc6134f15a69feca76bbf402c5f61a34c2daba9ed"; 

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
        const response = await fetch.post("https://api.jdoodle.com/v1/execute", {
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
