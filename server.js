const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
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
    let execCmd = [];
    let result = '';

    // Write the code to a file
    fs.writeFileSync(filename, code);

    try {
        // Determine the execution command based on the language
        if (language === 'javascript') {
            // JavaScript: Execute using Node.js
            execCmd = ['node', filename];
        } else if (language === 'python') {
            // Python: Execute using Python
            execCmd = ['python3', filename];
        } else if (language === 'c') {
            // C: Compile with gcc and then run
            execCmd = ['gcc', filename, '-o', 'test.out'];
        } else if (language === 'cpp') {
            // C++: Compile with g++ and then run
            execCmd = ['g++', filename, '-o', 'test.out'];
        }

        // Compile the code (if necessary) for C and C++ languages
        const processCompile = spawn(execCmd[0], execCmd.slice(1), { shell: true });

        // Capture compilation errors and logs
        processCompile.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
            result += data.toString();
        });

        processCompile.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
            result += data.toString();
        });

        processCompile.on('exit', (code) => {
            if (code !== 0) {
                return res.status(400).json({ error: `Compilation failed with exit code ${code}. Logs: ${result}` });
            }

            if (language === 'c' || language === 'cpp') {
                // After compiling, set execute permissions for the compiled binary (if on Linux)
                if (getPlatform() === 'linux') {
                    exec('chmod +x test.out', (err, stdout, stderr) => {
                        if (err) {
                            console.error(`chmod failed: ${stderr}`);
                            return res.status(500).json({ error: `Permission error: ${stderr}` });
                        }
                    });
                }

                // Run the compiled binary for C and C++
                const execFile = spawn('./test.out', { input });

                execFile.stdout.on('data', (data) => {
                    console.log(`stdout: ${data}`);
                    result += data.toString();
                });

                execFile.stderr.on('data', (data) => {
                    console.error(`stderr: ${data}`);
                    result += data.toString();
                });

                execFile.on('exit', (exitCode) => {
                    if (exitCode !== 0) {
                        return res.status(400).json({ error: `Execution failed with exit code ${exitCode}. Logs: ${result}` });
                    }
                    res.status(200).json({ output: result });
                    cleanUp();
                });
            } else {
                // For non-C/C++ languages, just execute directly
                const process = spawn(execCmd[0], execCmd.slice(1), { input });

                process.stdout.on('data', (data) => {
                    console.log(`stdout: ${data}`);
                    result += data.toString();
                });

                process.stderr.on('data', (data) => {
                    console.error(`stderr: ${data}`);
                    result += data.toString();
                });

                process.on('exit', (exitCode) => {
                    if (exitCode !== 0) {
                        return res.status(400).json({ error: `Execution failed with exit code ${exitCode}. Logs: ${result}` });
                    }
                    res.status(200).json({ output: result });
                    cleanUp();
                });
            }
        });
    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.status(500).json({ error: `Internal Server Error: ${error.message}` });
        cleanUp();
    }

    // Clean up generated files (temporary files)
    function cleanUp() {
        fs.unlinkSync(filename);
        if (fs.existsSync('test.out')) {
            fs.unlinkSync('test.out');
        }
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
