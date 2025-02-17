const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const cors = require('cors');
const app = express();

// Middleware to parse JSON body
app.use(express.json());
app.use(cors());  // Enable Cross-Origin Resource Sharing (CORS)

// Supported code types and their file extensions
const codeTypes = {
    python: 'py',
    javascript: 'js',
    c: 'c',
    cpp: 'cpp',
};

// Helper function to determine platform
function getPlatform() {
    return process.platform === 'win32' ? 'windows' : 'linux';
}

// POST route to handle code compilation and execution
app.post('/compiler', (req, res) => {
    const { language, code, input } = req.body;

    // Validate the language
    if (!codeTypes[language]) {
        return res.status(400).json({ error: 'Unsupported language' });
    }

    const fileExtension = codeTypes[language];
    const filename = `test.${fileExtension}`;
    const outputBinary = 'test.out';
    let execCmd = [];
    let result = '';

    // Write the code to a file
    fs.writeFileSync(filename, code);

    try {
        // Determine the execution command based on the language
        if (language === 'javascript') {
            execCmd = ['node', filename];
        } else if (language === 'python') {
            execCmd = ['python3', filename];
        } else if (language === 'c') {
            execCmd = ['gcc', filename, '-o', outputBinary];
        } else if (language === 'cpp') {
            execCmd = ['g++', filename, '-o', outputBinary];
        }

        // Compile if needed (for C and C++)
        if (language === 'c' || language === 'cpp') {
            const compileProcess = spawn(execCmd[0], execCmd.slice(1), { shell: true });
            compileProcess.stderr.on('data', (data) => result += data.toString());
            compileProcess.on('exit', (code) => {
                if (code !== 0) {
                    cleanUp();
                    return res.status(400).json({ error: `Compilation failed. Logs: ${result}` });
                }
                executeBinary(res, input);
            });
        } else {
            executeProcess(res, execCmd, input);
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.status(500).json({ error: `Internal Server Error: ${error.message}` });
        cleanUp();
    }

    // Execute compiled binary (for C/C++)
    function executeBinary(res, input) {
        const runProcess = spawn(`./${outputBinary}`);
        if (input) runProcess.stdin.write(input + "\n"); // Provide input to the compiled binary
        runProcess.stdin.end();
        captureProcessOutput(runProcess, res);
    }

    // Execute script (for Python/JS)
    function executeProcess(res, cmd, input) {
        const runProcess = spawn(cmd[0], cmd.slice(1));
        if (input) runProcess.stdin.write(input + "\n"); // Provide input to the script
        runProcess.stdin.end();
        captureProcessOutput(runProcess, res);
    }

    // Capture output and handle errors
    function captureProcessOutput(process, res) {
        let output = '';
        process.stdout.on('data', (data) => output += data.toString());
        process.stderr.on('data', (data) => output += data.toString());
        process.on('exit', (exitCode) => {
            cleanUp();
            if (exitCode !== 0) {
                return res.status(400).json({ error: `Execution failed. Logs: ${output}` });
            }
            res.status(200).json({ output });
        });
    }

    // Clean up generated files
    function cleanUp() {
        if (fs.existsSync(filename)) fs.unlinkSync(filename);
        if (fs.existsSync(outputBinary)) fs.unlinkSync(outputBinary);
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
