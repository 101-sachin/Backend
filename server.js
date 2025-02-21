const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());  // Enable CORS

const codeTypes = {
    python: 'py',
    javascript: 'js',
    c: 'c',
    cpp: 'cpp',
};

// Detect OS platform
function getPlatform() {
    return process.platform === 'win32' ? 'windows' : 'linux';
}

app.post('/compiler', (req, res) => {
    const { language, code, input } = req.body;

    if (!codeTypes[language]) {
        return res.status(400).json({ error: 'Unsupported language' });
    }

    const fileExtension = codeTypes[language];
    const filename = `test.${fileExtension}`;
    const outputBinary = getPlatform() === 'windows' ? 'test.exe' : 'test.out';
    let execCmd = [];
    let result = '';

    fs.writeFileSync(filename, code);

    try {
        if (language === 'javascript') {
            execCmd = ['node', filename];
        } else if (language === 'python') {
            execCmd = [getPlatform() === 'windows' ? 'python' : 'python3', filename];
        } else if (language === 'c') {
            execCmd = ['gcc', filename, '-o', outputBinary];
        } else if (language === 'cpp') {
            execCmd = ['g++', filename, '-o', outputBinary];
        }

        if (language === 'c' || language === 'cpp') {
            const compileProcess = spawn(execCmd[0], execCmd.slice(1), { shell: true });

            compileProcess.stderr.on('data', (data) => {
                result += data.toString();
                console.error(`Compilation Error: ${result}`);
            });

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

    function executeBinary(res, input) {
        const runProcess = spawn(getPlatform() === 'windows' ? outputBinary : `./${outputBinary}`);
        if (input) runProcess.stdin.write(input + "\n");
        runProcess.stdin.end();
        captureProcessOutput(runProcess, res);
    }

    function executeProcess(res, cmd, input) {
        const runProcess = spawn(cmd[0], cmd.slice(1));
        if (input) runProcess.stdin.write(input + "\n");
        runProcess.stdin.end();
        captureProcessOutput(runProcess, res);
    }

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

    function cleanUp() {
        if (fs.existsSync(filename)) fs.unlinkSync(filename);
        if (fs.existsSync(outputBinary)) fs.unlinkSync(outputBinary);
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
